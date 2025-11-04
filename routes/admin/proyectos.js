// routes/admin/proyectos.js

import express from 'express';
const router = express.Router();

// Fíjate que las URLs apuntan a localhost:3001
const misProyectos = [
    { 
        nombre: 'Demo Cerveza (Ecuaciones)', 
        url: 'http://localhost:3001/demostracion_beer/archivos_html_css_js/' 
    },
    { 
        nombre: 'Diseño - Rayo', 
        url: 'http://localhost:3001/diseños chileros/rayo.html' 
    },
    { 
        nombre: 'Diseño - Rayos', 
        url: 'http://localhost:3001/diseños chileros/rayos.html' 
    },
    { 
        nombre: 'Calculadora', 
        url: 'http://localhost:3001/sem1sem2/Calculadora/calc.html' 
    },
    { 
        nombre: 'Dice Game', 
        url: 'http://localhost:3001/sem1sem2/Dice Game/dicee.html' 
    },
    { 
        nombre: 'Drum Kit', 
        url: 'http://localhost:3001/sem1sem2/Drum/' 
    },
    { 
        nombre: 'Formulario Star Wars', 
        url: 'http://localhost:3001/sem1sem2/formularioregistrostarwars/tareaformularioderegistro.html' 
    },
    { 
        nombre: 'Página de Registro', 
        url: 'http://localhost:3001/sem1sem2/pagina de reigistro.html' 
    },
    { 
        nombre: 'Página Web Tarea', 
        url: 'http://localhost:3001/sem1sem2/paginawebtarea/paginaweb.html' 
    },
    { 
        nombre: 'Parcial 1 JAGL', 
        url: 'http://localhost:3001/sem1sem2/PARCIAL1_JAGL/parcial1.html' 
    },
    { 
        nombre: 'SUNSET', 
        url: 'http://localhost:3001/sem1sem2/SUNSET.html' 
    },
    { 
        nombre: 'SuperMercado', 
        url: 'http://localhost:3001/sem1sem2/SuperMercado/' 
    },
    { 
        nombre: 'Tablero Ajedrez', 
        url: 'http://localhost:3001/sem1sem2/tableroajedrez/tableroajedrez.html' 
    },
    { 
        nombre: 'Tarjeta de Cumpleaños', 
        url: 'http://localhost:3001/sem1sem2/tarjeta de cumpleaños.html' 
    },
    { 
        nombre: 'Tarjeta Cumpleaños Shrek', 
        url: 'http://localhost:3001/sem1sem2/tarjetadecum/cum de shrek.html' 
    },
    { 
        nombre: 'Tarjeta Precios', 
        url: 'http://localhost:3001/sem1sem2/tarjetaprecios/tarea de tarjeta de precios.html' 
    },
    { 
        nombre: 'Trifoliar Física', 
        url: 'http://localhost:3001/sem3/trifoliarfisica.html' 
    }
];

// Esta ruta será GET /admin/proyectos
router.get('/', (req, res) => {
    // Tu middleware 'res.locals' ya nos da 'user' e 'isAdmin'
    // así que no necesitamos pasarlos aquí.
    
    res.render('admin/pages/proyectos', { // Usaremos una subcarpeta 'admin' en 'views'
        title: 'Dashboard de Proyectos',
        pageCSS: '/css/admin-dashboard.css', // Opcional (te doy el CSS en el Paso 3)
        pageJS: [], // No necesita JS por ahora
        proyectos: misProyectos // Le pasamos la lista a la vista
    });
});

export default router;