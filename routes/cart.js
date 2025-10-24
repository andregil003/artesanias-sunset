// routes/cart.js
import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

const MAX_QUANTITY_PER_ITEM = 15;
const MAX_DIFFERENT_ITEMS = 50;

// FIX: Removed redundant validateSession function.
// express-session guarantees req.sessionID exists.

function getUserIdentifier(req) {
    return req.user ? req.user.customer_id : req.sessionID;
}

function getUserColumn(req) {
    return req.user ? 'customer_id' : 'session_id';
}

// FIX: This route now correctly fetches the cart for
// both authenticated users and guests using the helper functions.
router.get('/', async (req, res) => {
    try {
        const identifier = getUserIdentifier(req);
        const column = getUserColumn(req);
        
        const result = await pool.query(
            `SELECT 
                ci.id,
                ci.quantity,
                ci.size,
                ci.color,
                p.product_id,
                p.product_name,
                p.price,
                p.image_url,
                p.stock,
                c.category_name,
                (p.price * ci.quantity) as item_total
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.product_id
             LEFT JOIN categories c ON p.category_id = c.category_id
             WHERE ci.${column} = $1 AND p.is_active = true
             ORDER BY ci.created_at DESC`,
            [identifier]
        );
        
        const cartItems = result.rows;
        const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.item_total), 0);
        // Note: Shipping calculation is hardcoded and should be dynamic.
        const shipping = cartItems.length > 0 ? 25.00 : 0;
        const total = subtotal + shipping;
        
        res.render('pages/cart', {
            title: 'Carrito - Artesanías Sunset',
            pageCSS: '/css/cart.css',
            pageJS: ['/js/cart.js'],
            cartItems,
            subtotal: subtotal.toFixed(2),
            shipping: shipping.toFixed(2),
            total: total.toFixed(2)
        });
        
    } catch (error) {
        console.error('Error obteniendo carrito:', error);
        res.status(500).render('pages/500', {
            title: 'Error del servidor',
            pageCSS: '/css/errors.css',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

router.get('/count', async (req, res) => {
    try {
        // FIX: Removed call to validateSession
        const identifier = getUserIdentifier(req);
        const column = getUserColumn(req);
        
        const result = await pool.query(
            `SELECT COALESCE(SUM(quantity), 0) as count 
             FROM cart_items 
             WHERE ${column} = $1`,
            [identifier]
        );
        
        res.json({ 
            success: true, 
            count: parseInt(result.rows[0].count) 
        });
        
    } catch (error) {
        console.error('Error obteniendo contador:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error del servidor' 
        });
    }
});

router.post('/add', async (req, res) => {
    try {
        // FIX: Removed call to validateSession
        const { product_id, quantity = 1, size = '', color = '' } = req.body;
        
        if (!product_id || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
            return res.status(400).json({ 
                success: false, 
                message: 'Datos inválidos' 
            });
        }
        
        const identifier = getUserIdentifier(req);
        const column = getUserColumn(req);
        
        const productResult = await pool.query(
            'SELECT stock, is_active FROM products WHERE product_id = $1',
            [product_id]
        );
        
        if (productResult.rows.length === 0 || !productResult.rows[0].is_active) {
            return res.status(404).json({ 
                success: false, 
                message: 'Producto no disponible' 
            });
        }
        
        const availableStock = productResult.rows[0].stock;
        
        const existingResult = await pool.query(
            `SELECT id, quantity 
             FROM cart_items 
             WHERE ${column} = $1 AND product_id = $2 AND size = $3 AND color = $4`,
            [identifier, product_id, size, color]
        );
        
        if (existingResult.rows.length > 0) {
            const currentQty = existingResult.rows[0].quantity;
            const newQty = Math.min(currentQty + quantity, MAX_QUANTITY_PER_ITEM, availableStock);
            
            await pool.query(
                'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
                [newQty, existingResult.rows[0].id]
            );
            
            return res.json({ 
                success: true, 
                message: 'Cantidad actualizada' 
            });
        }

        // FIX: Moved item limit check here.
        // Only check when adding a *new* distinct item.
        const countResult = await pool.query(
            `SELECT COUNT(DISTINCT product_id) as count 
             FROM cart_items 
             WHERE ${column} = $1`,
            [identifier]
        );
        
        if (parseInt(countResult.rows[0].count) >= MAX_DIFFERENT_ITEMS) {
            return res.status(400).json({ 
                success: false, 
                message: `Límite de ${MAX_DIFFERENT_ITEMS} productos diferentes alcanzado` 
            });
        }
        
        const insertQuery = req.user
            ? 'INSERT INTO cart_items (customer_id, product_id, quantity, size, color) VALUES ($1, $2, $3, $4, $5)'
            : 'INSERT INTO cart_items (session_id, product_id, quantity, size, color) VALUES ($1, $2, $3, $4, $5)';
        
        await pool.query(insertQuery, [identifier, product_id, Math.min(quantity, availableStock), size, color]);
        
        res.json({ 
            success: true, 
            message: 'Producto agregado al carrito' 
        });
        
    } catch (error) {
        console.error('Error agregando al carrito:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error del servidor' 
        });
    }
});

router.put('/update/:id', async (req, res) => {
    try {
        // FIX: Removed call to validateSession
        const cartItemId = parseInt(req.params.id);
        const { quantity } = req.body;
        
        if (isNaN(cartItemId) || !quantity || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
            return res.status(400).json({ 
                success: false, 
                message: 'Datos inválidos' 
            });
        }
        
        const identifier = getUserIdentifier(req);
        const column = getUserColumn(req);
        
        const result = await pool.query(
            `SELECT ci.product_id, p.stock, p.is_active 
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.product_id
             WHERE ci.id = $1 AND ci.${column} = $2`,
            [cartItemId, identifier]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Item no encontrado' 
            });
        }
        
        if (!result.rows[0].is_active) {
            return res.status(400).json({ 
                success: false, 
                message: 'Producto no disponible' 
            });
        }
        
        const availableStock = result.rows[0].stock;
        const finalQuantity = Math.min(quantity, availableStock, MAX_QUANTITY_PER_ITEM);
        
        await pool.query(
            'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
            [finalQuantity, cartItemId]
        );
        
        res.json({ 
            success: true, 
            message: 'Cantidad actualizada' 
        });
        
    } catch (error) {
        console.error('Error actualizando carrito:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error del servidor' 
        });
    }
});

router.delete('/remove/:id', async (req, res) => {
    try {
        // FIX: Removed call to validateSession
        const cartItemId = parseInt(req.params.id);
        
        if (isNaN(cartItemId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID inválido' 
            });
        }
        
        const identifier = getUserIdentifier(req);
        const column = getUserColumn(req);
        
        const result = await pool.query(
            `DELETE FROM cart_items WHERE id = $1 AND ${column} = $2 RETURNING id`,
            [cartItemId, identifier]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Item no encontrado' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Producto eliminado' 
        });
        
    } catch (error) {
        console.error('Error eliminando del carrito:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error del servidor' 
        });
    }
});

router.post('/sync-from-local', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Debes iniciar sesión' 
            });
        }
        
        const { items } = req.body;
        
        if (!Array.isArray(items) || items.length === 0) {
            return res.json({ 
                success: true, 
                message: 'No hay items para sincronizar' 
            });
        }
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            let syncedCount = 0;
            
            for (const item of items) {
                const { product_id, quantity, size = '', color = '' } = item;
                
                const productResult = await client.query(
                    'SELECT stock, is_active FROM products WHERE product_id = $1',
                    [product_id]
                );
                
                if (productResult.rows.length === 0 || !productResult.rows[0].is_active) {
                    continue;
                }
                
                const availableStock = productResult.rows[0].stock;
                
                const existingResult = await client.query(
                    `SELECT id, quantity 
                     FROM cart_items 
                     WHERE customer_id = $1 AND product_id = $2 AND size = $3 AND color = $4`,
                    [req.user.customer_id, product_id, size, color]
                );
                
                if (existingResult.rows.length > 0) {
                    const newQty = Math.min(
                        existingResult.rows[0].quantity + quantity,
                        MAX_QUANTITY_PER_ITEM,
                        availableStock
                    );
                    
                    await client.query(
                        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
                        [newQty, existingResult.rows[0].id]
                    );
                } else {
                    await client.query(
                        'INSERT INTO cart_items (customer_id, product_id, quantity, size, color) VALUES ($1, $2, $3, $4, $5)',
                        [req.user.customer_id, product_id, Math.min(quantity, availableStock), size, color]
                    );
                }
                
                syncedCount++;
            }
            
            await client.query('COMMIT');
            
            res.json({ 
                success: true, 
                message: `${syncedCount} productos migrados correctamente` 
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error sincronizando carrito:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error del servidor' 
        });
    }
});

export default router;