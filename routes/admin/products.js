// routes/admin/products.js
import express from 'express';
import { pool } from '../../config/database.js';

const router = express.Router();

function buildProductFilters(query) {
    const filters = {
        search: query.search?.trim() || '',
        category: query.category || '',
        status: query.status || '',
        sortBy: query.sort || 'newest',
        minPrice: parseFloat(query.min_price) || 0,
        maxPrice: parseFloat(query.max_price) || 999999,
        stockFilter: query.stock || ''
    };
    
    return filters;
}

function buildWhereClause(filters, params) {
    const conditions = ['1=1'];

    if (filters.search) {
        params.push(`%${filters.search}%`);
        conditions.push(`product_name ILIKE $${params.length}`);
    }

    if (filters.category) {
        params.push(filters.category);
        conditions.push(`category_name = $${params.length}`);
    }

    if (filters.status === 'active') {
        conditions.push('is_active = true');
    } else if (filters.status === 'inactive') {
        conditions.push('is_active = false');
    }

    if (filters.minPrice > 0) {
        params.push(filters.minPrice);
        conditions.push(`price >= $${params.length}`);
    }

    if (filters.maxPrice < 999999) {
        params.push(filters.maxPrice);
        conditions.push(`price <= $${params.length}`);
    }

    if (filters.stockFilter === 'out-of-stock') {
        conditions.push('total_stock = 0');
    } else if (filters.stockFilter === 'low-stock') {
        conditions.push('total_stock > 0 AND total_stock < 5');
    } else if (filters.stockFilter === 'in-stock') {
        conditions.push('total_stock >= 5');
    }

    return conditions.join(' AND ');
}

function getOrderClause(sortBy) {
    const orderMap = {
        'oldest': 'created_at ASC',
        'price-asc': 'price ASC',
        'price-desc': 'price DESC',
        'name': 'product_name ASC',
        'name-desc': 'product_name DESC',
        'newest': 'created_at DESC'
    };
    return orderMap[sortBy] || orderMap.newest;
}

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const showAll = req.query.all === 'true';
        
        const filters = buildProductFilters(req.query);
        const params = [];
        
        const withClause = `
            WITH product_stats AS (
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.price,
                    p.stock,
                    p.image_url,
                    p.is_active,
                    p.created_at,
                    c.category_name,
                    -- ✅ Cálculo de stock corregido
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 
                            FROM product_variants v 
                            WHERE v.product_id = p.product_id AND v.is_active = true
                        )
                        THEN (
                            SELECT COALESCE(SUM(v.stock), 0) 
                            FROM product_variants v 
                            WHERE v.product_id = p.product_id AND v.is_active = true
                        )
                        ELSE p.stock
                    END AS total_stock,
                    -- ✅ Indicador si el producto tiene variantes
                    EXISTS (
                        SELECT 1 
                        FROM product_variants v 
                        WHERE v.product_id = p.product_id AND v.is_active = true
                    ) AS has_variants
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
            )
        `;

        const whereClause = buildWhereClause(filters, params);
        const orderClause = getOrderClause(filters.sortBy);
        
        const productsQuery = `
            ${withClause}
            SELECT * FROM product_stats
            WHERE ${whereClause}
            ORDER BY ${orderClause}
            ${showAll ? '' : `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`}
        `;
        
        const finalParams = showAll ? params : [...params, limit, offset];
        const productsResult = await pool.query(productsQuery, finalParams);
        
        const countQuery = `
            ${withClause}
            SELECT COUNT(*) AS total FROM product_stats WHERE ${whereClause}
        `;
        const countResult = await pool.query(countQuery, params);
        
        const totalProducts = parseInt(countResult.rows[0].total);
        const totalPages = showAll ? 1 : Math.ceil(totalProducts / limit);
        
        const categoriesResult = await pool.query(
            'SELECT category_id, category_name FROM categories ORDER BY category_name'
        );
        
        res.render('admin/pages/products-list', {
            title: 'Productos - Admin',
            pageCSS: '/css/admin.css',
            pageJS: ['/js/admin-products.js'],
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
            pageCSS: '/css/admin.css',
            products: [],
            categories: [],
            filters: {},
            pagination: {},
            error: 'Error al cargar productos'
        });
    }
});

router.get('/new', async (req, res) => {
    try {
        const categoriesResult = await pool.query(
            'SELECT category_id, category_name FROM categories ORDER BY category_name'
        );
        
        res.render('admin/pages/products-form', {
            title: 'Nuevo Producto - Admin',
            pageCSS: '/css/admin.css',
            pageJS: ['/js/admin-products-form.js'],
            product: null,
            categories: categoriesResult.rows,
            isEdit: false
        });
    } catch (error) {
        console.error('Error al cargar formulario:', error);
        res.status(500).send('Error al cargar formulario');
    }
});

router.get('/:id/edit', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        
        if (isNaN(productId)) {
            return res.status(400).send('ID de producto no válido');
        }
        
        const productResult = await pool.query(
            'SELECT * FROM products WHERE product_id = $1',
            [productId]
        );
        
        if (productResult.rows.length === 0) {
            return res.status(404).send('Producto no encontrado');
        }
        
        const categoriesResult = await pool.query(
            'SELECT category_id, category_name FROM categories ORDER BY category_name'
        );
        
        res.render('admin/pages/products-form', {
            title: 'Editar Producto - Admin',
            pageCSS: '/css/admin.css',
            pageJS: ['/js/admin-products-form.js'],
            product: productResult.rows[0],
            categories: categoriesResult.rows,
            isEdit: true
        });
    } catch (error) {
        console.error('Error al cargar producto:', error);
        res.status(500).send('Error al cargar producto');
    }
});

router.post('/', async (req, res) => {
    try {
        const { product_name, description, price, stock, category_id, is_active, image_url } = req.body;
        
        if (!product_name || !price || !category_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nombre, precio y categoría son obligatorios' 
            });
        }
        
        const result = await pool.query(
            `INSERT INTO products (product_name, description, price, stock, category_id, is_active, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING product_id`,
            [
                product_name.trim(),
                description?.trim() || '',
                parseFloat(price),
                parseInt(stock) || 0,
                parseInt(category_id),
                is_active === true || is_active === 'true',
                image_url?.trim() || null
            ]
        );
        
        res.json({ success: true, product_id: result.rows[0].product_id });
        
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ success: false, message: 'Error al crear producto' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        
        if (isNaN(productId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID de producto no válido' 
            });
        }
        
        const { product_name, description, price, stock, category_id, is_active, image_url } = req.body;
        
        if (!product_name || !price || !category_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nombre, precio y categoría son obligatorios' 
            });
        }
        
        const result = await pool.query(
            `UPDATE products 
             SET product_name = $1, description = $2, price = $3, stock = $4, 
                 category_id = $5, is_active = $6, image_url = $7, updated_at = CURRENT_TIMESTAMP 
             WHERE product_id = $8
             RETURNING product_id`,
            [
                product_name.trim(),
                description?.trim() || '',
                parseFloat(price),
                parseInt(stock) || 0,
                parseInt(category_id),
                is_active === true || is_active === 'true',
                image_url?.trim() || null,
                productId
            ]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Producto no encontrado' 
            });
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar producto' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        
        if (isNaN(productId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID de producto no válido' 
            });
        }
        
        const result = await pool.query(
            'UPDATE products SET is_active = false WHERE product_id = $1 RETURNING product_id',
            [productId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Producto no encontrado' 
            });
        }
        
        res.json({ success: true, message: 'Producto desactivado correctamente' });
        
    } catch (error) {
        console.error('Error al desactivar producto:', error);
        res.status(500).json({ success: false, message: 'Error al desactivar producto' });
    }
});

export default router;