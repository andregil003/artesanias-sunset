// admin/products.js
import express from 'express';
import { pool } from '../../config/database.js';

const router = express.Router();

// GET - Lista de productos
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const showAll = req.query.all === 'true';
        
        const filters = {
            search: req.query.search || '',
            category: req.query.category || '',
            status: req.query.status || '',
            sortBy: req.query.sort || 'newest',
            minPrice: parseFloat(req.query.min_price) || 0,
            maxPrice: parseFloat(req.query.max_price) || 999999,
            stockFilter: req.query.stock || ''
        };
        
        let whereConditions = ['1=1'];
        let params = [];
        let paramIndex = 1;
        
        if (filters.search) {
            whereConditions.push(`p.product_name ILIKE $${paramIndex++}`);
            params.push(`%${filters.search}%`);
        }
        
        if (filters.category) {
            whereConditions.push(`c.category_name = $${paramIndex++}`);
            params.push(filters.category);
        }
        
        // FIX: Parameterized SQLi vulnerability
        if (filters.status === 'active') {
            whereConditions.push(`p.is_active = $${paramIndex++}`);
            params.push(true);
        } else if (filters.status === 'inactive') {
            whereConditions.push(`p.is_active = $${paramIndex++}`);
            params.push(false);
        }
        
        if (filters.minPrice > 0) {
            whereConditions.push(`p.price >= $${paramIndex++}`);
            params.push(filters.minPrice);
        }
        
        if (filters.maxPrice < 999999) {
            whereConditions.push(`p.price <= $${paramIndex++}`);
            params.push(filters.maxPrice);
        }
        
        // FIX: Parameterized SQLi vulnerability (for '5')
        const stockCalc = '(COALESCE(p.stock, 0) + COALESCE(variant_stock.total, 0))';
        if (filters.stockFilter === 'out-of-stock') {
            whereConditions.push(`${stockCalc} = 0`);
        } else if (filters.stockFilter === 'low-stock') {
            whereConditions.push(`${stockCalc} > 0 AND ${stockCalc} < $${paramIndex++}`);
            params.push(5);
        } else if (filters.stockFilter === 'in-stock') {
            whereConditions.push(`${stockCalc} >= $${paramIndex++}`);
            params.push(5);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const orderMap = {
            'oldest': 'p.created_at ASC',
            'price-asc': 'p.price ASC',
            'price-desc': 'p.price DESC',
            'name': 'p.product_name ASC',
            'name-desc': 'p.product_name DESC',
            'newest': 'p.created_at DESC'
        };
        const orderClause = orderMap[filters.sortBy] || orderMap.newest;
        
        // FIX: Added window function COUNT(*) OVER() to get total count
        const productsQuery = `
            SELECT p.product_id, p.product_name, p.price, p.stock, p.image_url, p.is_active, p.created_at,
                   c.category_name,
                   COALESCE(p.stock, 0) + COALESCE(variant_stock.total, 0) AS total_stock,
                   COALESCE(variant_count.count, 0) AS variant_count,
                   COUNT(*) OVER() AS total_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN (SELECT product_id, SUM(stock) AS total FROM product_variants GROUP BY product_id) variant_stock ON p.product_id = variant_stock.product_id
            LEFT JOIN (SELECT product_id, COUNT(*) AS count FROM product_variants GROUP BY product_id) variant_count ON p.product_id = variant_count.product_id
            WHERE ${whereClause}
            ORDER BY ${orderClause}
            ${showAll ? '' : `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`}
        `;
        
        const finalParams = showAll ? params : [...params, limit, offset];

        // FIX: Run main query and categories query concurrently
        const [productsResult, categoriesResult] = await Promise.all([
            pool.query(productsQuery, finalParams),
            pool.query('SELECT category_id, category_name FROM categories ORDER BY category_name')
        ]);
        
        // FIX: Removed redundant count query. Get count from main query.
        const totalProducts = parseInt(productsResult.rows[0]?.total_count || 0);
        const totalPages = showAll ? 1 : Math.ceil(totalProducts / limit);
        
        res.render('admin/pages/products-list', {
            title: 'Productos - Admin',
            products: productsResult.rows,
            categories: categoriesResult.rows,
            filters,
            pagination: {
                currentPage: page,
                totalPages,
                totalProducts,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                showAll,
                limit
            }
        });
        
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).render('admin/pages/products-list', {
            title: 'Productos - Admin',
            products: [],
            categories: [],
            filters: {},
            pagination: {},
            error: 'Error al cargar productos'
        });
    }
});

// GET - Formulario nuevo
router.get('/new', async (req, res) => {
    try {
        const categoriesResult = await pool.query('SELECT category_id, category_name FROM categories ORDER BY category_name');
        
        res.render('admin/pages/products-form', {
            title: 'Nuevo Producto - Admin',
            product: null,
            categories: categoriesResult.rows,
            isEdit: false
        });
    } catch (error) {
        console.error('Error al cargar formulario:', error);
        res.status(500).send('Error al cargar formulario');
    }
});

// GET - Formulario editar
router.get('/:id/edit', async (req, res) => {
    try {
        // FIX: Run queries concurrently
        const [productResult, categoriesResult] = await Promise.all([
            pool.query('SELECT * FROM products WHERE product_id = $1', [parseInt(req.params.id)]),
            pool.query('SELECT category_id, category_name FROM categories ORDER BY category_name')
        ]);
        
        if (productResult.rows.length === 0) {
            return res.status(404).send('Producto no encontrado');
        }
        
        res.render('admin/pages/products-form', {
            title: 'Editar Producto - Admin',
            product: productResult.rows[0],
            categories: categoriesResult.rows,
            isEdit: true
        });
    } catch (error) {
        console.error('Error al cargar producto:', error);
        res.status(500).send('Error al cargar producto');
    }
});

// POST - Crear
router.post('/', async (req, res) => {
    try {
        const { product_name, description, price, stock, category_id, is_active, image_url } = req.body;
        
        // FIX: Robust boolean check for 'is_active'
        const isActive = [true, 'true', 'on'].includes(is_active);

        const result = await pool.query(
            `INSERT INTO products (product_name, description, price, stock, category_id, is_active, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING product_id`,
            [product_name, description || '', parseFloat(price), parseInt(stock) || 0, parseInt(category_id), isActive, image_url || null]
        );
        
        res.json({ success: true, product_id: result.rows[0].product_id });
        
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ success: false, message: 'Error al crear producto' });
    }
});

// PUT - Actualizar
router.put('/:id', async (req, res) => {
    try {
        const { product_name, description, price, stock, category_id, is_active, image_url } = req.body;
        
        // FIX: Robust boolean check for 'is_active'
        const isActive = [true, 'true', 'on'].includes(is_active);

        await pool.query(
            `UPDATE products SET product_name = $1, description = $2, price = $3, stock = $4, category_id = $5, is_active = $6, image_url = $7, updated_at = CURRENT_TIMESTAMP WHERE product_id = $8`,
            [product_name, description || '', parseFloat(price), parseInt(stock) || 0, parseInt(category_id), isActive, image_url || null, parseInt(req.params.id)]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar producto' });
    }
});

// DELETE - Desactivar
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('UPDATE products SET is_active = false WHERE product_id = $1', [parseInt(req.params.id)]);
        res.json({ success: true, message: 'Producto desactivado correctamente' });
    } catch (error) {
        console.error('Error al desactivar producto:', error);
        res.status(500).json({ success: false, message: 'Error al desactivar producto' });
    }
});

export default router;