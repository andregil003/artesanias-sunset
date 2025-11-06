// routes/admin/dashboard.js
import express from 'express';
import { pool } from '../../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const kpisQuery = `
            SELECT 
                (SELECT COUNT(*) FROM products WHERE is_active = true) as total_products,
                (SELECT COUNT(*) FROM categories) as total_categories,
                (SELECT COUNT(*) FROM orders WHERE status != 'Cancelado') as total_orders,
                (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'Cancelado') as total_revenue,
                (SELECT COUNT(*) FROM orders WHERE status IN ('Pendiente', 'Procesando')) as pending_orders,
                (SELECT COUNT(*) FROM customers) as total_customers
        `;

        const lowStockQuery = `
            WITH product_stock AS (
                SELECT
                    p.product_id,
                    p.product_name,
                    p.price,
                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM product_variants v
                            WHERE v.product_id = p.product_id
                              AND v.is_active = true
                        ) THEN (
                            SELECT COALESCE(SUM(v2.stock), 0)
                            FROM product_variants v2
                            WHERE v2.product_id = p.product_id
                              AND v2.is_active = true
                        )
                        ELSE p.stock
                    END AS total_stock
                FROM products p
                WHERE p.is_active = true
            )
            SELECT product_id, product_name, total_stock, price
            FROM product_stock
            WHERE total_stock < 5
            ORDER BY total_stock ASC
            LIMIT 5
        `;

        const recentOrdersQuery = `
            SELECT o.order_id, o.order_date, o.total, o.status,
                   c.first_name || ' ' || c.last_name as customer_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            ORDER BY o.order_date DESC
            LIMIT 5
        `;

        // Ejecutar en paralelo
        const [kpisResult, lowStockResult, recentOrdersResult] = await Promise.all([
            pool.query(kpisQuery),
            pool.query(lowStockQuery),
            pool.query(recentOrdersQuery)
        ]);

        const kpis = kpisResult.rows[0];

        res.render('admin/pages/dashboard', {
            layout: 'admin/layout', // <-- AÑADIDO
            page: 'dashboard',      // <-- AÑADIDO
            title: 'Dashboard Admin - Artesanías Sunset',
            pageCSS: '/css/admin.css',
            pageJS: ['/js/admin.js'],
            kpis: kpis,
            lowStockProducts: lowStockResult.rows,
            recentOrders: recentOrdersResult.rows
        });

    } catch (error) {
        console.error('Error en dashboard admin:', error);
        res.status(500).render('pages/500', {
            // Nota: El error 500 usa el layout principal (pages/500), lo cual está bien.
            title: 'Error del servidor',
            pageCSS: '/css/errors.css',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

export default router;