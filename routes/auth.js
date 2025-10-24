// routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import passport from 'passport';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pool } from '../config/database.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function sanitizeInput(str) {
    return str?.trim() || '';
}

async function sendPasswordResetEmail(email, firstName, resetLink) {
    if (!transporter) {
        console.warn('⚠️ Email no configurado. Link:', resetLink);
        return false;
    }
    
    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Recuperación de contraseña - Artesanías Sunset',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #FF7F3F;">Recuperación de contraseña</h2>
                <p>Hola ${firstName},</p>
                <p>Recibimos una solicitud para restablecer tu contraseña en Artesanías Sunset.</p>
                <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
                <p style="margin: 20px 0;">
                    <a href="${resetLink}" style="background-color: #FF7F3F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Restablecer contraseña
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">Este enlace expirará en 1 hora por seguridad.</p>
                <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, ignora este correo.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">Artesanías Sunset - Artesanías Guatemaltecas Hechas a Mano</p>
            </div>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado a:', email);
        return true;
    } catch (error) {
        console.error('❌ Error enviando email:', error);
        return false;
    }
}

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/auth/login?error=Error con Google' }),
    (req, res) => res.redirect('/?welcome=true')
);

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/auth/login?error=Error con Facebook' }),
    (req, res) => res.redirect('/?welcome=true')
);

router.get('/login', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/');
    res.render('pages/login', {
        title: 'Iniciar Sesión - Artesanías Sunset',
        pageCSS: '/css/auth.css',
        error: req.query.error || null,
        message: req.query.message || null
    });
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Error en login:', err);
            return res.redirect('/auth/login?error=Error del servidor');
        }
        
        if (!user) {
            return res.redirect(`/auth/login?error=${encodeURIComponent(info.message || 'Error de autenticación')}`);
        }
        
        // FIX: Removed redundant DB call for last_login (handled by passport strategy)
        req.logIn(user, (err) => {
            if (err) {
                console.error('Error al crear sesión:', err);
                return res.redirect('/auth/login?error=Error al crear sesión');
            }
            res.redirect('/');
        });
    })(req, res, next);
});

router.get('/register', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/');
    res.render('pages/register', {
        title: 'Crear Cuenta - Artesanías Sunset',
        pageCSS: '/css/auth.css',
        error: req.query.error || null
    });
});

router.post('/register', async (req, res) => {
    try {
        const first_name = sanitizeInput(req.body.first_name);
        const last_name = sanitizeInput(req.body.last_name);
        const email = sanitizeInput(req.body.email?.toLowerCase());
        const password = req.body.password;
        const password_confirm = req.body.password_confirm;
        const phone = sanitizeInput(req.body.phone);
        
        if (!first_name || !last_name || !email || !password) {
            return res.redirect('/auth/register?error=Todos los campos son obligatorios');
        }
        
        if (!validateEmail(email)) {
            return res.redirect('/auth/register?error=Email no válido');
        }
        
        if (password !== password_confirm) {
            return res.redirect('/auth/register?error=Las contraseñas no coinciden');
        }
        
        if (password.length < 8) {
            return res.redirect('/auth/register?error=La contraseña debe tener al menos 8 caracteres');
        }
        
        const existingUser = await pool.query(
            'SELECT email FROM customers WHERE LOWER(email) = LOWER($1)',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.redirect('/auth/register?error=Este email ya está registrado');
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO customers (first_name, last_name, email, password_hash, phone, created_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
             RETURNING customer_id, email, first_name, last_name, is_admin`, // Added is_admin for deserializeUser
            [first_name, last_name, email, passwordHash, phone || null]
        );
        
        req.login(result.rows[0], (err) => {
            if (err) {
                console.error('Error al crear sesión:', err);
                return res.redirect('/auth/login?message=Cuenta creada. Por favor inicia sesión');
            }
            res.redirect('/?welcome=true');
        });
        
    } catch (error) {
        console.error('Error en registro:', error);
        return res.redirect('/auth/register?error=Error al crear la cuenta');
    }
});

router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error('Error al cerrar sesión:', err);
        req.session.destroy((err) => {
            if (err) console.error('Error al destruir sesión:', err);
            res.redirect('/?logout=true');
        });
    });
});

// FIX: Refactored to use Promise.all for concurrent queries
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const [userResult, ordersResult, recentOrdersResult] = await Promise.all([
            pool.query(
                `SELECT c.customer_id, c.first_name, c.last_name, c.email, c.phone, c.created_at, c.last_login,
                        ci.city_name, co.country_name
                 FROM customers c
                 LEFT JOIN cities ci ON c.city_id = ci.city_id
                 LEFT JOIN countries co ON ci.country_id = co.country_id
                 WHERE c.customer_id = $1`,
                [req.user.customer_id]
            ),
            pool.query(
                `SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_spent
                 FROM orders
                 WHERE customer_id = $1 AND status != 'Cancelado'`,
                [req.user.customer_id]
            ),
            pool.query(
                `SELECT order_id, order_date, total, status, currency_code
                 FROM orders
                 WHERE customer_id = $1
                 ORDER BY order_date DESC LIMIT 5`,
                [req.user.customer_id]
            )
        ]);
        
        res.render('pages/profile', {
            title: 'Mi Perfil - Artesanías Sunset',
            pageCSS: '/css/auth.css',
            user: userResult.rows[0],
            stats: ordersResult.rows[0],
            recentOrders: recentOrdersResult.rows
        });
    } catch (error) {
        console.error('Error al cargar perfil:', error);
        res.redirect('/?error=profile');
    }
});

router.post('/profile/update', isAuthenticated, async (req, res) => {
    try {
        const first_name = sanitizeInput(req.body.first_name);
        const last_name = sanitizeInput(req.body.last_name);
        const phone = sanitizeInput(req.body.phone);
        
        if (!first_name || !last_name) {
            return res.redirect('/auth/profile?error=Nombre y apellido son obligatorios');
        }
        
        await pool.query(
            'UPDATE customers SET first_name = $1, last_name = $2, phone = $3 WHERE customer_id = $4',
            [first_name, last_name, phone || null, req.user.customer_id]
        );
        
        res.redirect('/auth/profile?success=Perfil actualizado correctamente');
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.redirect('/auth/profile?error=Error al actualizar');
    }
});

router.post('/profile/change-password', isAuthenticated, async (req, res) => {
    try {
        const { current_password, new_password, new_password_confirm } = req.body;
        
        if (!current_password || !new_password || !new_password_confirm) {
            return res.redirect('/auth/profile?error=Todos los campos son obligatorios');
        }
        
        if (new_password !== new_password_confirm) {
            return res.redirect('/auth/profile?error=Las contraseñas nuevas no coinciden');
        }
        
        if (new_password.length < 8) {
            return res.redirect('/auth/profile?error=La contraseña debe tener al menos 8 caracteres');
        }
        
        const userResult = await pool.query(
            'SELECT password_hash FROM customers WHERE customer_id = $1',
            [req.user.customer_id]
        );
        
        if (!userResult.rows[0].password_hash) {
            return res.redirect('/auth/profile?error=Esta cuenta usa inicio de sesión con Google/Facebook');
        }
        
        const isValidPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
        
        if (!isValidPassword) {
            return res.redirect('/auth/profile?error=Contraseña actual incorrecta');
        }
        
        const newPasswordHash = await bcrypt.hash(new_password, 10);
        
        await pool.query(
            'UPDATE customers SET password_hash = $1 WHERE customer_id = $2',
            [newPasswordHash, req.user.customer_id]
        );
        
        res.redirect('/auth/profile?success=Contraseña cambiada correctamente');
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.redirect('/auth/profile?error=Error al cambiar contraseña');
    }
});

router.get('/forgot-password', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/');
    res.render('pages/forgot-password', {
        title: 'Recuperar Contraseña - Artesanías Sunset',
        pageCSS: '/css/auth.css',
        message: req.query.message || null,
        error: req.query.error || null
    });
});

router.post('/forgot-password', async (req, res) => {
    try {
        const email = sanitizeInput(req.body.email?.toLowerCase());
        
        if (!email || !validateEmail(email)) {
            return res.redirect('/auth/forgot-password?error=Email no válido');
        }
        
        const userResult = await pool.query(
            'SELECT customer_id, email, first_name FROM customers WHERE LOWER(email) = LOWER($1)',
            [email]
        );
        
        // Timing attack mitigation: always return the same message
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            
            await pool.query(
                'INSERT INTO password_reset_tokens (customer_id, token, expires_at, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
                [user.customer_id, token, expiresAt]
            );
            
            const resetLink = `${process.env.BASE_URL || 'http://localhost:3000'}/auth/reset-password/${token}`;
            
            await sendPasswordResetEmail(user.email, user.first_name, resetLink);
        }
        
        res.redirect('/auth/forgot-password?message=Si el email existe, recibirás un enlace de recuperación');
    } catch (error) {
        console.error('Error en forgot-password:', error);
        res.redirect('/auth/forgot-password?error=Error al procesar solicitud');
    }
});

router.get('/reset-password/:token', async (req, res) => {
    try {
        const tokenResult = await pool.query(
            'SELECT customer_id, expires_at FROM password_reset_tokens WHERE token = $1 AND used = FALSE',
            [req.params.token]
        );
        
        if (tokenResult.rows.length === 0) {
            return res.redirect('/auth/forgot-password?error=Token inválido o expirado');
        }
        
        if (new Date() > new Date(tokenResult.rows[0].expires_at)) {
            return res.redirect('/auth/forgot-password?error=Token expirado');
        }
        
        res.render('pages/reset-password', {
            title: 'Restablecer Contraseña - Artesanías Sunset',
            pageCSS: '/css/auth.css',
            token: req.params.token,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Error al verificar token:', error);
        res.redirect('/auth/forgot-password?error=Error al verificar token');
    }
});

router.post('/reset-password/:token', async (req, res) => {
    const client = await pool.connect();
    try {
        const { token } = req.params;
        const { password, password_confirm } = req.body;
        
        if (!password || !password_confirm) {
            return res.redirect(`/auth/reset-password/${token}?error=Todos los campos son obligatorios`);
        }
        
        if (password !== password_confirm) {
            return res.redirect(`/auth/reset-password/${token}?error=Las contraseñas no coinciden`);
        }
        
        if (password.length < 8) {
            return res.redirect(`/auth/reset-password/${token}?error=La contraseña debe tener al menos 8 caracteres`);
        }
        
        await client.query('BEGIN');
        
        // Check token validity again inside the transaction
        const tokenResult = await client.query(
            'SELECT customer_id, expires_at FROM password_reset_tokens WHERE token = $1 AND used = FALSE FOR UPDATE',
            [token]
        );
        
        if (tokenResult.rows.length === 0 || new Date() > new Date(tokenResult.rows[0].expires_at)) {
            await client.query('ROLLBACK');
            return res.redirect('/auth/forgot-password?error=Token inválido o expirado');
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        await client.query(
            'UPDATE customers SET password_hash = $1 WHERE customer_id = $2',
            [passwordHash, tokenResult.rows[0].customer_id]
        );
        
        await client.query(
            'UPDATE password_reset_tokens SET used = TRUE WHERE token = $1',
            [token]
        );
        
        await client.query('COMMIT');
        
        res.redirect('/auth/login?message=Contraseña restablecida correctamente');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al restablecer contraseña:', error);
        res.redirect(`/auth/reset-password/${req.params.token}?error=Error al restablecer contraseña`);
    } finally {
        client.release();
    }
});

export default router;