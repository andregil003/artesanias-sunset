// routes/analytics.js
import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

function convertToCSV(data) {
    if (!data?.length) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
        headers.map(h => {
            const val = row[h] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
}

async function getKPIs() {
    const result = await pool.query(`
        SELECT 
            (SELECT COUNT(*) FROM customers) as total_customers,
            (SELECT COUNT(*) FROM products WHERE is_active = true) as total_products,
            (SELECT COUNT(*) FROM orders WHERE status != 'Cancelado') as total_orders,
            (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'Cancelado') as total_revenue,
            (SELECT COALESCE(AVG(total), 0) FROM orders WHERE status != 'Cancelado') as avg_ticket,
            (SELECT COUNT(*) FROM orders WHERE status IN ('Pendiente', 'Procesando')) as pending_orders
    `);
    return result.rows[0];
}

router.get('/', async (req, res) => {
    try {
        const [
            kpis,
            salesByCurrency,
            salesByCategory,
            monthlyRevenue,
            topProducts,
            lowStock
        ] = await Promise.all([
            getKPIs(),
            pool.query(`
                SELECT currency_code, COUNT(*) as total_orders, SUM(total) as revenue
                FROM orders WHERE status != 'Cancelado'
                GROUP BY currency_code ORDER BY currency_code
            `),
            pool.query('SELECT * FROM view_sales_by_category ORDER BY revenue DESC LIMIT 10'),
            pool.query('SELECT * FROM view_monthly_revenue ORDER BY month DESC LIMIT 12'),
            pool.query(`
                SELECT p.product_id, p.product_name, c.category_name,
                       COALESCE(SUM(oi.quantity), 0) as total_sold,
                       COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue,
                       p.stock as current_stock
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN order_items oi ON p.product_id = oi.product_id
                LEFT JOIN orders o ON oi.order_id = o.order_id
                WHERE o.status != 'Cancelado' OR o.status IS NULL
                GROUP BY p.product_id, p.product_name, c.category_name, p.stock
                ORDER BY total_sold DESC NULLS LAST LIMIT 5
            `),
            pool.query('SELECT * FROM view_low_stock_products LIMIT 10')
        ]);
        
        res.render('pages/analytics', {
            title: 'Analytics - Artesanías Sunset',
            pageCSS: '/css/analytics.css',
            pageJS: [],
            kpis,
            salesByCategory: salesByCategory.rows,
            monthlyRevenue: monthlyRevenue.rows,
            topProducts: topProducts.rows,
            lowStock: lowStock.rows,
            salesByCurrency: salesByCurrency.rows
        });
        
    } catch (error) {
        console.error('Error en analytics:', error);
        res.status(500).render('pages/500', { 
            title: 'Error del servidor',
            pageCSS: '/css/errors.css',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

router.get('/download-report', async (req, res) => {
    try {
        const reportQueries = {
            'sales': ['SELECT * FROM view_sales_by_category ORDER BY revenue DESC', 'ventas_por_categoria.csv'],
            'products': ['SELECT * FROM view_top_products', 'top_productos.csv'],
            'customers': ['SELECT * FROM view_customer_lifetime_value ORDER BY lifetime_value DESC', 'valor_clientes.csv'],
            'revenue': ['SELECT * FROM view_monthly_revenue ORDER BY month DESC', 'ingresos_mensuales.csv'],
            'stock': ['SELECT * FROM view_low_stock_products ORDER BY stock ASC', 'stock_bajo.csv']
        };
        
        const type = req.query.type || 'full';
        
        if (type === 'full') {
            const kpis = await getKPIs();
            const data = Object.entries(kpis).map(([key, value]) => ({
                metrica: key.replace(/_/g, ' '),
                valor: value
            }));
            
            const csv = convertToCSV(data);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="reporte_completo.csv"');
            return res.send('\uFEFF' + csv);
        }
        
        const [query, filename] = reportQueries[type] || reportQueries.sales;
        const result = await pool.query(query);
        const csv = convertToCSV(result.rows);
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv);
        
    } catch (error) {
        console.error('Error generando reporte:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/sales-by-category', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM view_sales_by_category ORDER BY revenue DESC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/top-products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM view_top_products');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/customer-orders', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const [data, count] = await Promise.all([
            pool.query(
                'SELECT * FROM view_customer_lifetime_value ORDER BY lifetime_value DESC NULLS LAST LIMIT $1 OFFSET $2',
                [limit, offset]
            ),
            pool.query('SELECT COUNT(*) FROM view_customer_lifetime_value')
        ]);
        
        res.json({
            success: true,
            data: data.rows,
            pagination: { page, limit, total: parseInt(count.rows[0].count) }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/pending-shipments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM view_pending_orders ORDER BY order_date');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/monthly-revenue', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM view_monthly_revenue ORDER BY month DESC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/low-stock', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM view_low_stock_products ORDER BY stock ASC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;