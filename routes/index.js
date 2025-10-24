// routes/index.js
import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// ========================================
// QUERIES REUTILIZABLES
// ========================================
const PRODUCT_SELECT = `
    SELECT 
        p.*,
        c.category_name,
        CASE 
            WHEN EXISTS (SELECT 1 FROM product_variants WHERE product_id = p.product_id AND is_active = true) 
            THEN (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = p.product_id AND is_active = true)
            ELSE p.stock
        END as available_stock,
        EXISTS (SELECT 1 FROM product_variants WHERE product_id = p.product_id AND is_active = true) as has_variants
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.category_id
`;

const SORT_OPTIONS = {
    'newest': 'p.created_at DESC',
    'oldest': 'p.created_at ASC',
    'price-asc': 'p.price ASC',
    'price-desc': 'p.price DESC',
    'name': 'p.product_name ASC',
    'name-desc': 'p.product_name DESC'
};

const CATEGORY_SLUGS = {
    'joyeria': 'Joyería',
    'joyeria-plata': 'Joyería de Plata',
    'joyeria-jade': 'Joyería de Jade',
    'ceramica': 'Cerámica',
    'ceramica-vidriada': 'Cerámica Vidriada',
    'ceramica-decorativa': 'Cerámica Decorativa',
    'textiles': 'Textiles',
    'textiles-mayas': 'Textiles Mayas',
    'huipiles': 'Huipiles',
    'cortes': 'Cortes',
    'ropa': 'Ropa',
    'mascaras': 'Máscaras',
    'madera-tallada': 'Madera Tallada',
    'decoracion-hogar': 'Decoración del Hogar',
    'bolsas-accesorios': 'Bolsas y Accesorios'
};

// ========================================
// FUNCIONES HELPER
// ========================================
function buildFilters(req) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const showAll = req.query.all === 'true';
    const sortBy = req.query.sort || 'newest';
    const minPrice = parseFloat(req.query.min_price) || 0;
    const maxPrice = parseFloat(req.query.max_price) || null;
    
    let selectedCategories = req.query.category || [];
    if (typeof selectedCategories === 'string') {
        selectedCategories = [selectedCategories];
    }
    
    return {
        page,
        limit,
        offset: (page - 1) * limit,
        showAll,
        sortBy,
        orderBy: SORT_OPTIONS[sortBy] || SORT_OPTIONS.newest,
        minPrice,
        maxPrice,
        selectedCategories
    };
}

function buildWhereConditions(baseCondition, filters, params) {
    let conditions = [baseCondition];
    
    if (filters.selectedCategories?.length > 0) {
        const placeholders = filters.selectedCategories.map((cat, i) => {
            params.push(cat);
            return `$${params.length}`;
        }).join(',');
        conditions.push(`c.category_name IN (${placeholders})`);
    }
    
    if (filters.minPrice > 0) {
        params.push(filters.minPrice);
        conditions.push(`p.price >= $${params.length}`);
    }
    
    if (filters.maxPrice) {
        params.push(filters.maxPrice);
        conditions.push(`p.price <= $${params.length}`);
    }
    
    return conditions.join(' AND ');
}

async function executeProductQuery(whereConditions, filters, params) {
    const countQuery = `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.category_id WHERE ${whereConditions}`;
    const countResult = await pool.query(countQuery, params);
    const totalProducts = parseInt(countResult.rows[0].count);
    
    let query = `${PRODUCT_SELECT} WHERE ${whereConditions} ORDER BY ${filters.orderBy}`;
    
    if (!filters.showAll) {
        params.push(filters.limit, filters.offset);
        query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    }
    
    const result = await pool.query(query, params);
    
    return {
        products: result.rows,
        totalProducts,
        totalPages: Math.ceil(totalProducts / filters.limit)
    };
}

// ========================================
// RUTAS
// ========================================

// GET / - Home
router.get('/', async (req, res) => {
    try {
        const featuredResult = await pool.query(`${PRODUCT_SELECT} WHERE p.is_active = true ORDER BY RANDOM() LIMIT 6`);
        const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY category_name');
        
        res.render('pages/home', {
            title: 'Inicio - Artesanías Sunset',
            pageCSS: '/css/home.css',
            pageJS: ['/js/cart.js'],
            featuredProducts: featuredResult.rows,
            categories: categoriesResult.rows
        });
    } catch (error) {
        console.error('Error cargando home:', error);
        res.status(500).render('pages/500', {
            title: 'Error del servidor',
            pageCSS: '/css/errors.css',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// GET /catalog - Catálogo completo
router.get('/catalog', async (req, res) => {
    try {
        const filters = buildFilters(req);
        const params = [];
        const whereConditions = buildWhereConditions('p.is_active = true', filters, params);
        
        const { products, totalProducts, totalPages } = await executeProductQuery(whereConditions, filters, params);
        
        const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY category_name');
        const priceRangeResult = await pool.query('SELECT MIN(price) as min_price, MAX(price) as max_price FROM products WHERE is_active = true');
        
        res.render('pages/catalog', {
            title: 'Catálogo - Artesanías Sunset',
            pageCSS: '/css/catalog.css',
            pageJS: ['/js/cart.js', '/js/catalog.js'],
            products,
            categories: categoriesResult.rows,
            priceRange: priceRangeResult.rows[0],
            filters: {
                sortBy: filters.sortBy,
                minPrice: filters.minPrice,
                maxPrice: filters.maxPrice,
                selectedCategories: filters.selectedCategories
            },
            pagination: {
                currentPage: filters.page,
                totalPages,
                totalProducts,
                limit: filters.limit,
                hasNext: filters.page < totalPages,
                hasPrev: filters.page > 1,
                showAll: filters.showAll
            }
        });
    } catch (error) {
        console.error('Error en catálogo:', error);
        res.status(500).render('pages/500', {
            title: 'Error del servidor',
            pageCSS: '/css/errors.css',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// GET /category/:category - Por categoría
router.get('/category/:category', async (req, res) => {
    try {
        const categoryName = CATEGORY_SLUGS[req.params.category];
        
        if (!categoryName) {
            return res.status(404).render('pages/404', {
                title: 'Categoría no encontrada',
                pageCSS: '/css/errors.css'
            });
        }
        
        const filters = buildFilters(req);
        const params = [categoryName];
        const whereConditions = buildWhereConditions('c.category_name = $1 AND p.is_active = true', filters, params);
        
        const { products, totalProducts, totalPages } = await executeProductQuery(whereConditions, filters, params);
        
        const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY category_name');
        const priceRangeResult = await pool.query('SELECT MIN(p.price) as min_price, MAX(p.price) as max_price FROM products p LEFT JOIN categories c ON p.category_id = c.category_id WHERE c.category_name = $1 AND p.is_active = true', [categoryName]);
        
        res.render('pages/catalog', {
            title: `${categoryName} - Artesanías Sunset`,
            pageCSS: '/css/catalog.css',
            pageJS: ['/js/cart.js', '/js/catalog.js'],
            products,
            categories: categoriesResult.rows,
            categoryFilter: categoryName,
            priceRange: priceRangeResult.rows[0],
            filters: {
                sortBy: filters.sortBy,
                minPrice: filters.minPrice,
                maxPrice: filters.maxPrice
            },
            pagination: {
                currentPage: filters.page,
                totalPages,
                totalProducts,
                limit: filters.limit,
                hasNext: filters.page < totalPages,
                hasPrev: filters.page > 1,
                showAll: filters.showAll
            }
        });
    } catch (error) {
        console.error('Error en categoría:', error);
        res.status(500).render('pages/500', {
            title: 'Error del servidor',
            pageCSS: '/css/errors.css',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// GET /search - Búsqueda
router.get('/search', async (req, res) => {
    try {
        const searchQuery = req.query.q?.trim() || '';
        
        if (!searchQuery) {
            return res.redirect('/catalog');
        }
        
        const filters = buildFilters(req);
        const params = [`%${searchQuery}%`];
        let whereConditions = 'p.is_active = true AND (LOWER(p.product_name) LIKE LOWER($1) OR LOWER(p.description) LIKE LOWER($1))';
        
        if (req.query.category) {
            params.push(req.query.category);
            whereConditions += ` AND c.category_name = $${params.length}`;
        }
        
        const { products, totalProducts, totalPages } = await executeProductQuery(whereConditions, filters, params);
        
        res.render('pages/search', {
            title: `Búsqueda: ${searchQuery} - Artesanías Sunset`,
            pageCSS: '/css/catalog.css',
            pageJS: ['/js/cart.js'],
            searchQuery,
            products,
            resultsCount: totalProducts,
            pagination: {
                currentPage: filters.page,
                totalPages,
                totalProducts,
                limit: filters.limit,
                hasNext: filters.page < totalPages,
                hasPrev: filters.page > 1,
                showAll: filters.showAll
            }
        });
    } catch (error) {
        console.error('Error en búsqueda:', error);
        res.status(500).render('pages/500', {
            title: 'Error del servidor',
            pageCSS: '/css/errors.css',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// GET /contact
router.get('/contact', (req, res) => {
    res.render('pages/contact', {
        title: 'Contacto - Artesanías Sunset'
    });
});

// GET /blog
router.get('/blog', (req, res) => {
    res.render('pages/blog', {
        title: 'Blog - Artesanías Sunset',
        articles: [],
        comingSoon: true
    });
});

router.get('/blog/:id', (req, res) => res.redirect('/blog'));

export default router;