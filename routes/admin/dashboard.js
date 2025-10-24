// admin/dashboard.js
import express from 'express';
import { pool } from '../../config/database.js';

const router = express.Router();

// GET /admin - Dashboard principal
router.get('/', async (req, res) => {
    try {
        // KPIs básicos
        const kpisQuery = `
            SELECT 
                (SELECT COUNT(*) FROM products WHERE is_active = true) as total_products,
                (SELECT COUNT(*) FROM categories) as total_categories,
                (SELECT COUNT(*) FROM orders WHERE status != 'Cancelado') as total_orders,
                (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'Cancelado') as total_revenue,
                (SELECT COUNT(*) FROM orders WHERE status IN ('Pendiente', 'Procesando')) as pending_orders,
                (SELECT COUNT(*) FROM customers) as total_customers
        `;
        
        // Productos con stock bajo
        const lowStockQuery = `
            SELECT product_id, product_name, stock, price
            FROM products
            WHERE stock < 5 AND is_active = true
            ORDER BY stock ASC
            LIMIT 5
        `;
        
        // Órdenes recientes
        const recentOrdersQuery = `
            SELECT o.order_id, o.order_date, o.total, o.status,
                   c.first_name || ' ' || c.last_name as customer_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            ORDER BY o.order_date DESC
            LIMIT 5
        `;
        
        // FIX: Run all independent queries concurrently
        const [kpisResult, lowStockResult, recentOrdersResult] = await Promise.all([
            pool.query(kpisQuery),
            pool.query(lowStockQuery),
            pool.query(recentOrdersQuery)
        ]);

        const kpis = kpisResult.rows[0];
        
        res.render('admin/pages/dashboard', {
            title: 'Dashboard Admin - Artesanías Sunset',
            kpis: kpis,
            lowStockProducts: lowStockResult.rows,
            recentOrders: recentOrdersResult.rows
        });
        
    } catch (error) {
        console.error('Error en dashboard admin:', error);
        res.status(500).render('pages/500', {
            title: 'Error del servidor',
            pageCSS: '/css/errors.css',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

export default router;