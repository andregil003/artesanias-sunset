// routes/products.js
import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.post('/batch', async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.json([]);
        }
        
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        
        const result = await pool.query(
            `SELECT 
                p.product_id, 
                p.product_name, 
                CAST(p.price AS DECIMAL(10,2)) as price, 
                p.image_url, 
                p.stock,
                c.slug AS category_slug -- FIX: Select slug directly
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.category_id
             WHERE p.product_id IN (${placeholders}) AND p.is_active = true`,
            ids
        );
        
        // FIX: Removed unnecessary .map() transformation
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json([]);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        
        if (isNaN(productId)) {
            return res.status(404).render('pages/404', {
                title: 'Producto no encontrado',
                pageCSS: '/css/errors.css'
            });
        }
        
        // Note: The CTE with json_agg is a highly performant query.
        const result = await pool.query(
            `WITH product_data AS (
                SELECT 
                    p.*, 
                    c.category_name, 
                    c.slug AS category_slug -- FIX: Select slug directly
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.category_id 
                WHERE p.product_id = $1 AND p.is_active = true
            ),
            variants_data AS (
                SELECT 
                    variant_id, variant_name, sku, size, color, material, 
                    additional_price, stock, is_active
                FROM product_variants 
                WHERE product_id = $1 AND is_active = true
                ORDER BY size, color
            ),
            reviews_data AS (
                SELECT 
                    pr.review_id, pr.rating, pr.review_text, 
                    pr.is_verified_purchase, pr.created_at,
                    c.first_name || ' ' || c.last_name as customer_name
                FROM product_reviews pr
                JOIN customers c ON pr.customer_id = c.customer_id
                WHERE pr.product_id = $1 AND pr.is_approved = true
                ORDER BY pr.created_at DESC
            )
            SELECT 
                (SELECT row_to_json(product_data.*) FROM product_data) as product,
                (SELECT json_agg(variants_data.*) FROM variants_data) as variants,
                (SELECT json_agg(reviews_data.*) FROM reviews_data) as reviews`,
            [productId]
        );
        
        if (!result.rows[0].product) {
            return res.status(404).render('pages/404', {
                title: 'Producto no encontrado',
                pageCSS: '/css/errors.css'
            });
        }
        
        const product = result.rows[0].product;
        const variants = result.rows[0].variants || [];
        const reviews = result.rows[0].reviews || [];
        
        // FIX: Removed line (product.category_slug is now part of the product object)

        product.sizesArray = [...new Set(variants.map(v => v.size).filter(Boolean))];
        product.colorsArray = [...new Set(variants.map(v => v.color).filter(Boolean))];
        product.materialsArray = [...new Set(variants.map(v => v.material).filter(Boolean))];
        product.variants = variants;
        
        product.hasVariants = variants.length > 0;
        product.availableStock = product.hasVariants 
            ? variants.reduce((sum, v) => sum + (v.stock || 0), 0)
            : product.stock;
        
        product.reviews = reviews;
        product.averageRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : 0;
        
        res.render('pages/product-detail', {
            title: `${product.product_name} - Artesanías Sunset`,
            pageCSS: '/css/product-detail.css',
            pageJS: ['/js/cart.js', '/js/product-detail.js'],
            product
        });
        
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        res.status(500).render('pages/500', {
            title: 'Error del servidor',
            pageCSS: '/css/errors.css',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

export default router;