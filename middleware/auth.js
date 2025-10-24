// middleware/auth.js - OPTIMIZADO

// Verificar si el usuario está autenticado
export function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login?error=authentication_required');
}

// Verificar si el usuario es administrador
export function isAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/login?error=admin_required');
    }
    
    // Asume que req.session.isAdmin es seteado en un middleware global
    if (req.session.isAdmin === true) {
        return next();
    }
    
    return res.status(403).render('pages/403', {
        title: 'Acceso Denegado',
        message: 'No tienes permisos de administrador'
    });
}

// Verificar si el usuario es cliente autenticado o invitado con sesión
export function isCustomerOrGuest(req, res, next) {
    // Permitir si está autenticado o tiene sesión activa
    if (req.isAuthenticated() || req.session) {
        return next();
    }
    res.redirect('/auth/login?error=authentication_required');
}