// config/passport.js 
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import bcrypt from 'bcrypt';
import { pool } from './database.js';

// ========================================
// HELPER FUNCTION 
// ========================================
async function handleOAuthLogin(profile, provider, done) {
    try {
        const email = profile.emails[0].value;
        const providerId = profile.id;

        let queryText;
        let queryParams;

        // 1. Buscar por provider ID
        if (provider === 'google') {
            queryText = 'SELECT * FROM customers WHERE google_id = $1';
        } else if (provider === 'facebook') {
            queryText = 'SELECT * FROM customers WHERE facebook_id = $1';
        } else {
            return done(new Error('Proveedor OAuth no válido'), null);
        }
        
        queryParams = [providerId];
        let result = await pool.query(queryText, queryParams);

        if (result.rows.length > 0) {
            await pool.query(
                'UPDATE customers SET last_login = CURRENT_TIMESTAMP WHERE customer_id = $1',
                [result.rows[0].customer_id]
            );
            return done(null, result.rows[0]);
        }

        // 2. Buscar por email (vincular cuenta existente)
        result = await pool.query(
            'SELECT * FROM customers WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        if (result.rows.length > 0) {
            const customerId = result.rows[0].customer_id;
            
            if (provider === 'google') {
                queryText = 'UPDATE customers SET google_id = $1, last_login = CURRENT_TIMESTAMP WHERE customer_id = $2';
            } else { // provider === 'facebook'
                queryText = 'UPDATE customers SET facebook_id = $1, last_login = CURRENT_TIMESTAMP WHERE customer_id = $2';
            }
            
            await pool.query(queryText, [providerId, customerId]);
            // Re-fetch to ensure consistent user object
            const updatedUser = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [customerId]);
            return done(null, updatedUser.rows[0]);
        }

        // 3. Crear nueva cuenta
        let newUser;
        if (provider === 'google') {
            queryText = `INSERT INTO customers (email, first_name, last_name, google_id, created_at, last_login) 
                         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
                         RETURNING *`;
        } else { // provider === 'facebook'
             queryText = `INSERT INTO customers (email, first_name, last_name, facebook_id, created_at, last_login) 
                         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
                         RETURNING *`;
        }
        
        newUser = await pool.query(queryText, [
            email, 
            profile.name.givenName, 
            profile.name.familyName, 
            providerId
        ]);

        return done(null, newUser.rows[0]);

    } catch (error) {
        console.error(`Error en ${provider} OAuth:`, error);
        return done(error, null);
    }
}

// ========================================
// LOCAL STRATEGY
// ========================================
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const result = await pool.query(
            'SELECT * FROM customers WHERE LOWER(email) = LOWER($1)',
            [email]
        );
        
        if (result.rows.length === 0) {
            return done(null, false, { message: 'Email no registrado' });
        }
        
        const user = result.rows[0];
        
        if (!user.password_hash) {
            return done(null, false, { 
                message: 'Esta cuenta usa inicio de sesión con Google o Facebook' 
            });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return done(null, false, { message: 'Contraseña incorrecta' });
        }
        
        await pool.query(
            'UPDATE customers SET last_login = CURRENT_TIMESTAMP WHERE customer_id = $1',
            [user.customer_id]
        );
        
        return done(null, user);
        
    } catch (error) {
        console.error('Error en Local Strategy:', error);
        return done(error);
    }
}));

// ========================================
// GOOGLE STRATEGY
// ========================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
        await handleOAuthLogin(profile, 'google', done);
    }));
}

// ========================================
// FACEBOOK STRATEGY
// ========================================
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/facebook/callback`,
        profileFields: ['id', 'emails', 'name']
    }, async (accessToken, refreshToken, profile, done) => {
        await handleOAuthLogin(profile, 'facebook', done);
    }));
}

// ========================================
// SERIALIZACIÓN
// ========================================

passport.serializeUser((user, done) => {
    done(null, user.customer_id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const queryText = `
            SELECT 
                customer_id, 
                email, 
                first_name, 
                last_name, 
                is_admin 
            FROM customers 
            WHERE customer_id = $1
        `;
        const result = await pool.query(queryText, [id]);
        
        // FIX: Return null (not false) if user not found, as per passport spec.
        done(null, result.rows.length > 0 ? result.rows[0] : null);

    } catch (error) {
        console.error('Error en deserializeUser:', error);
        done(error, null);
    }
});

export default passport;