// app.js 
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import passport from 'passport';
import dotenv from 'dotenv';
import os from 'os';
import expressEjsLayouts from 'express-ejs-layouts';

dotenv.config();

import { pool, testConnection } from './config/database.js';
import './config/passport.js';

import indexRoutes from './routes/index.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import analyticsRoutes from './routes/analytics.js';
import adminDashboardRoutes from './routes/admin/dashboard.js';
import adminProductsRoutes from './routes/admin/products.js';
import adminProyectosRoutes from './routes/admin/proyectos.js';
import authRoutes from './routes/auth.js';
import { isAdmin } from './middleware/auth.js';
import { icons } from './config/icons.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PgStore = pgSession(session);

// ========================================
// CONFIGURACIÓN EJS + LAYOUTS
// ========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressEjsLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// ========================================
// MIDDLEWARES BÁSICOS
// ========================================
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ========================================
// SESIONES
// ========================================
app.use(session({
    store: new PgStore({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// ========================================
// MIDDLEWARE GLOBAL
// ========================================
app.use((req, res, next) => {
    // Asignar valores básicos
    res.locals.icons = icons;
    res.locals.currentPath = req.path;
    res.locals.appName = process.env.APP_NAME || 'Artesanías Sunset';
    res.locals.contactEmail = process.env.CONTACT_EMAIL || 'info@artesaniassunset.com';
    res.locals.whatsappNumber = process.env.WHATSAPP_NUMBER || '50241298574';
    
    // Asignar user e isAdmin basado en autenticación
    if (req.isAuthenticated() && req.user) {
        res.locals.user = req.user;
        res.locals.isAdmin = req.user.is_admin || false;
        req.session.isAdmin = res.locals.isAdmin;
    } else {
        res.locals.user = null;
        res.locals.isAdmin = false;
    }
    
    next();
});

// ========================================
// RUTAS
// ========================================
app.use('/auth', authRoutes);
app.use('/', indexRoutes);
app.use('/product', productRoutes);
app.use('/cart', cartRoutes);
app.use('/analytics', isAdmin, analyticsRoutes);
app.use('/admin', isAdmin, adminDashboardRoutes);
app.use('/admin/products', isAdmin, adminProductsRoutes);
app.use('/admin/proyectos', isAdmin, adminProyectosRoutes);

// ========================================
// MANEJO DE ERRORES
// ========================================
app.use((req, res) => {
    res.status(404).render('pages/404', { 
        title: 'Página no encontrada',
    });
});

app.use((err, req, res, next) => {
    console.error('❌ Error del servidor:', err.stack);
    res.status(500).render('pages/500', {
        title: 'Error del servidor',
        error: process.env.NODE_ENV === 'development' ? err : {},
    });
});

// ========================================
// OBTENER IP LOCAL
// ========================================
function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const iface of Object.values(nets)) {
        for (const net of iface) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

// ========================================
// INICIAR SERVIDOR
// ========================================
app.listen(PORT, '0.0.0.0', async () => {
    const localIP = getLocalIP();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🚀 Servidor Local:    http://localhost:${PORT}`);
    console.log(`📱 Acceso desde red:  http://${localIP}:${PORT}`);
    console.log(`📁 Proyecto:          ${process.env.APP_NAME || 'Artesanías Sunset'}`);
    console.log(`🔐 Autenticación:     Local + OAuth (Google/Facebook)`);
    console.log(`💾 Sesiones:          PostgreSQL persistentes`);
    console.log(`🌍 Entorno:           ${process.env.NODE_ENV || 'development'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await testConnection();
});