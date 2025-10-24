-- ========================================
-- ARTESANÍAS SUNSET - SCHEMA FINAL
-- PostgreSQL 14+
-- Última actualización: 2025-10-09
-- Cambios: +currency_code en orders (conecta con currencies)
-- ========================================

-- ========================================
-- LIMPIEZA
-- ========================================

DROP VIEW IF EXISTS view_shipping_zones_revenue CASCADE;
DROP VIEW IF EXISTS view_payment_status_summary CASCADE;
DROP VIEW IF EXISTS view_pending_orders CASCADE;
DROP VIEW IF EXISTS view_low_stock_products CASCADE;
DROP VIEW IF EXISTS view_customer_lifetime_value CASCADE;
DROP VIEW IF EXISTS view_top_products CASCADE;
DROP VIEW IF EXISTS view_monthly_revenue CASCADE;
DROP VIEW IF EXISTS view_sales_by_category CASCADE;
DROP VIEW IF EXISTS view_shipping_zones_revenue CASCADE;

DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS shipping_rates CASCADE;
DROP TABLE IF EXISTS shipping_zones CASCADE;
DROP TABLE IF EXISTS product_reviews CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;

-- ========================================
-- TABLA DE SESIONES (Express Session)
-- ========================================

DROP TABLE IF EXISTS "session" CASCADE;

CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL COLLATE "default",
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
) WITH (OIDS=FALSE);

CREATE INDEX "IDX_session_expire" ON "session" ("expire");

COMMENT ON TABLE "session" IS 'Sesiones de usuarios (express-session + connect-pg-simple)';
COMMENT ON COLUMN "session"."sid" IS 'Session ID único';
COMMENT ON COLUMN "session"."sess" IS 'Datos de la sesión en formato JSON';
COMMENT ON COLUMN "session"."expire" IS 'Fecha de expiración de la sesión';

-- ========================================
-- SECCIÓN 1: GEOGRAFÍA (2 tablas)
-- ========================================

CREATE TABLE countries (
    country_id SERIAL PRIMARY KEY,
    country_code VARCHAR(20) NOT NULL UNIQUE,
    country_name VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE countries IS 'Catálogo de países';

CREATE TABLE cities (
    city_id SERIAL PRIMARY KEY,
    city_name VARCHAR(20) NOT NULL,
    country_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_cities_country 
        FOREIGN KEY (country_id) 
        REFERENCES countries(country_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

COMMENT ON TABLE cities IS 'Ciudades por país';

-- ========================================
-- FASE 3: MULTI-MONEDA (2 tablas) - MOVIDO AQUÍ
-- ========================================

CREATE TABLE currencies (
    currency_id SERIAL PRIMARY KEY,
    currency_code VARCHAR(3) UNIQUE NOT NULL,
    currency_name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE currencies IS 'Monedas soportadas (GTQ, USD)';

CREATE TABLE exchange_rates (
    rate_id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10,6) NOT NULL CHECK (rate > 0),
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_exchange_from 
        FOREIGN KEY (from_currency) 
        REFERENCES currencies(currency_code)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_exchange_to 
        FOREIGN KEY (to_currency) 
        REFERENCES currencies(currency_code)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

COMMENT ON TABLE exchange_rates IS 'Tasas de cambio';

-- ========================================
-- SECCIÓN 2: USUARIOS (2 tablas)
-- ========================================

CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    city_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    google_id VARCHAR(255) UNIQUE,
    facebook_id VARCHAR(255) UNIQUE, 
    
    CONSTRAINT fk_customers_city 
        FOREIGN KEY (city_id) 
        REFERENCES cities(city_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

COMMENT ON TABLE customers IS 'Clientes compradores - CRUD en panel admin';

CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Developer', 'Support')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE employees IS 'Administradores - Para login del panel';

-- ========================================
-- SECCIÓN 3: CATÁLOGO (2 tablas base)
-- ========================================

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    slug VARCHAR(255) UNIQUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE categories IS 'Categorías de productos';

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    wholesale_price DECIMAL(10,2) CHECK (wholesale_price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    weight DECIMAL(10,2) DEFAULT 0,
    volume DECIMAL(10,2) DEFAULT 0,
    image_url TEXT,
    slug VARCHAR(255) UNIQUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_products_category 
        FOREIGN KEY (category_id) 
        REFERENCES categories(category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

COMMENT ON TABLE products IS 'Productos - CRUD en panel admin';
COMMENT ON COLUMN products.wholesale_price IS 'Precio al por mayor';
COMMENT ON COLUMN products.image_url IS 'URL imagen principal o base64';

-- ========================================
-- FASE 2: VARIANTES Y RESEÑAS (2 tablas)
-- ========================================

CREATE TABLE product_variants (
    variant_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    variant_name VARCHAR(100) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    size VARCHAR(50),
    color VARCHAR(50),
    material VARCHAR(100),
    additional_price DECIMAL(10,2) DEFAULT 0,
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_variants_product 
        FOREIGN KEY (product_id) 
        REFERENCES products(product_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

COMMENT ON TABLE product_variants IS 'Variantes: tallas, colores, materiales';

CREATE TABLE product_reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    customer_id INTEGER,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_reviews_product 
        FOREIGN KEY (product_id) 
        REFERENCES products(product_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_reviews_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT uk_one_review_per_customer UNIQUE (product_id, customer_id)
);

COMMENT ON TABLE product_reviews IS 'Reseñas simplificadas (solo rating + texto)';

-- ========================================
-- SECCIÓN 4: DIRECCIONES (1 tabla)
-- ========================================

CREATE TABLE customer_addresses (
    address_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    city_id INTEGER NOT NULL,
    address_line TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    address_type VARCHAR(50) DEFAULT 'Residencial'
        CHECK (address_type IN ('Residencial', 'Comercial', 'Trabajo')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_addresses_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_addresses_city 
        FOREIGN KEY (city_id) 
        REFERENCES cities(city_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

COMMENT ON TABLE customer_addresses IS 'Direcciones de envío';

-- ========================================
-- FASE 2: ENVÍOS Y PROMOCIONES (3 tablas)
-- ========================================

CREATE TABLE shipping_zones (
    zone_id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    countries TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE shipping_zones IS 'Zonas: Guatemala, USA, Centroamérica';

CREATE TABLE shipping_rates (
    rate_id SERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL,
    min_weight DECIMAL(10,2) DEFAULT 0,
    max_weight DECIMAL(10,2),
    base_cost DECIMAL(10,2) NOT NULL CHECK (base_cost >= 0),
    cost_per_kg DECIMAL(10,2) DEFAULT 0,
    estimated_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_rates_zone 
        FOREIGN KEY (zone_id) 
        REFERENCES shipping_zones(zone_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

COMMENT ON TABLE shipping_rates IS 'Tarifas por peso y zona';

CREATE TABLE promotions (
    promo_id SERIAL PRIMARY KEY,
    promo_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    min_purchase DECIMAL(10,2) DEFAULT 0,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE promotions IS 'Códigos promocionales y descuentos';

-- ========================================
-- SECCIÓN 5: ÓRDENES (3 tablas) - ACTUALIZADO CON CURRENCY
-- ========================================

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    employee_id INTEGER,
    shipping_address_id INTEGER,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendiente' 
        CHECK (status IN ('Pendiente', 'Procesando', 'Enviado', 'Entregado', 'Cancelado')),
    shipping_status VARCHAR(50) DEFAULT 'Preparando'
        CHECK (shipping_status IN ('Preparando', 'En tránsito', 'Entregado', 'Fallido')),
    tracking_number VARCHAR(100),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'GTQ',
    promo_id INTEGER,
    discount_applied DECIMAL(10,2) DEFAULT 0 CHECK (discount_applied >= 0),
    shipping_rate_id INTEGER,
    shipping_cost DECIMAL(10,2) DEFAULT 0 CHECK (shipping_cost >= 0),
    guest_email VARCHAR(100),  
    guest_name VARCHAR(100),  
    guest_phone VARCHAR(20),      
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_orders_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_orders_employee 
        FOREIGN KEY (employee_id) 
        REFERENCES employees(employee_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_orders_address 
        FOREIGN KEY (shipping_address_id) 
        REFERENCES customer_addresses(address_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_orders_currency
        FOREIGN KEY (currency_code)
        REFERENCES currencies(currency_code)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_orders_promo 
        FOREIGN KEY (promo_id) 
        REFERENCES promotions(promo_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_orders_shipping_rate 
        FOREIGN KEY (shipping_rate_id) 
        REFERENCES shipping_rates(rate_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

COMMENT ON TABLE orders IS 'Órdenes - Listado en panel admin';
COMMENT ON COLUMN orders.currency_code IS 'FK: Moneda en la que se realizó la venta (GTQ/USD)';
COMMENT ON COLUMN orders.total IS 'Total en la moneda especificada en currency_code';
COMMENT ON COLUMN orders.promo_id IS 'FK: Código promocional aplicado';
COMMENT ON COLUMN orders.discount_applied IS 'Monto del descuento aplicado';
COMMENT ON COLUMN orders.shipping_rate_id IS 'FK: Tarifa de envío aplicada';
COMMENT ON COLUMN orders.shipping_cost IS 'Costo de envío calculado';

CREATE TABLE order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_items_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(order_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_items_product 
        FOREIGN KEY (product_id) 
        REFERENCES products(product_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_items_variant 
        FOREIGN KEY (variant_id) 
        REFERENCES product_variants(variant_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

COMMENT ON TABLE order_items IS 'Detalle de productos por orden';
COMMENT ON COLUMN order_items.variant_id IS 'FK: Variante específica comprada';
COMMENT ON COLUMN order_items.unit_price IS 'Precio unitario en la moneda de la orden';

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50) NOT NULL 
        CHECK (payment_method IN ('Efectivo', 'Tarjeta', 'Transferencia', 'PayPal')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Pendiente'
        CHECK (status IN ('Pendiente', 'Aprobado', 'Rechazado', 'Reembolsado')),
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_payments_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(order_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

COMMENT ON TABLE payments IS 'Pagos por orden';

-- ========================================
-- CARRITO TEMPORAL (1 tabla) - ACTUALIZADO
-- ========================================

CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255),
    customer_id INTEGER,  -- NUEVO: Para usuarios registrados
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 15),  -- ACTUALIZADO: límite 15
    size VARCHAR(50),
    color VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- NUEVO: Para limpieza automática
    
    CONSTRAINT fk_cart_product 
        FOREIGN KEY (product_id) 
        REFERENCES products(product_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_cart_variant 
        FOREIGN KEY (variant_id) 
        REFERENCES product_variants(variant_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_cart_customer  -- NUEVO
        FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    -- Un item puede tener session_id O customer_id, pero debe tener al menos uno
    CONSTRAINT chk_cart_owner CHECK (
        (session_id IS NOT NULL) OR (customer_id IS NOT NULL)
    )
);

COMMENT ON TABLE cart_items IS 'Carrito temporal - Soporta invitados (session_id) y usuarios registrados (customer_id)';
COMMENT ON COLUMN cart_items.session_id IS 'ID de sesión Express para invitados';
COMMENT ON COLUMN cart_items.customer_id IS 'FK: Cliente registrado (NULL para invitados)';
COMMENT ON COLUMN cart_items.variant_id IS 'FK: Variante seleccionada en el carrito';
COMMENT ON COLUMN cart_items.updated_at IS 'Para limpieza automática de carritos abandonados (30 días)';

-- Índices optimizados
CREATE INDEX idx_cart_session ON cart_items(session_id) WHERE customer_id IS NULL;
COMMENT ON INDEX idx_cart_session IS 'Búsqueda rápida de carritos de invitados';

CREATE INDEX idx_cart_customer ON cart_items(customer_id) WHERE customer_id IS NOT NULL;
COMMENT ON INDEX idx_cart_customer IS 'Búsqueda rápida de carritos de usuarios registrados';

CREATE INDEX idx_cart_product ON cart_items(product_id);
COMMENT ON INDEX idx_cart_product IS 'Analítica: productos más agregados al carrito';

CREATE INDEX idx_cart_cleanup ON cart_items(updated_at) WHERE customer_id IS NULL;
COMMENT ON INDEX idx_cart_cleanup IS 'Limpieza automática de carritos abandonados';

-- ========================================
-- AUTENTICACIÓN: RESET DE CONTRASEÑAS (1 tabla)
-- ========================================

CREATE TABLE password_reset_tokens (
    token_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT fk_reset_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id)
        ON DELETE CASCADE
);

COMMENT ON TABLE password_reset_tokens IS 'Tokens temporales para recuperación de contraseña';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expira después de 1 hora';
COMMENT ON COLUMN password_reset_tokens.used IS 'Evita reutilización del mismo token';

-- ========================================
-- ÍNDICES - ACTUALIZADO
-- ========================================

CREATE INDEX idx_order_items_order_product 
ON order_items(order_id, product_id);
COMMENT ON INDEX idx_order_items_order_product IS 'Optimiza consultas de productos en órdenes específicas';

CREATE INDEX idx_order_items_variant 
ON order_items(variant_id) 
WHERE variant_id IS NOT NULL;
COMMENT ON INDEX idx_order_items_variant IS 'Optimiza reportes de variantes más vendidas';

CREATE INDEX idx_orders_customer_date 
ON orders(customer_id, order_date DESC);
COMMENT ON INDEX idx_orders_customer_date IS 'Historial cronológico de órdenes por cliente';

CREATE INDEX idx_orders_currency 
ON orders(currency_code, order_date DESC);
COMMENT ON INDEX idx_orders_currency IS 'Reportes de ventas por moneda';

CREATE INDEX idx_products_category_price 
ON products(category_id, price);
COMMENT ON INDEX idx_products_category_price IS 'Filtros de catálogo (categoría + orden por precio)';

CREATE INDEX idx_orders_status_date 
ON orders(status, order_date DESC);
COMMENT ON INDEX idx_orders_status_date IS 'Panel admin: órdenes pendientes/procesando';

CREATE INDEX idx_orders_promo 
ON orders(promo_id) 
WHERE promo_id IS NOT NULL;
COMMENT ON INDEX idx_orders_promo IS 'Optimiza análisis de uso de promociones';

CREATE INDEX idx_orders_shipping_rate 
ON orders(shipping_rate_id) 
WHERE shipping_rate_id IS NOT NULL;
COMMENT ON INDEX idx_orders_shipping_rate IS 'Optimiza reportes de ingresos por zona de envío';

CREATE INDEX idx_variants_product_active 
ON product_variants(product_id, is_active);
COMMENT ON INDEX idx_variants_product_active IS 'Carga rápida de variantes activas por producto';

CREATE INDEX idx_reviews_product_rating 
ON product_reviews(product_id, rating DESC);
COMMENT ON INDEX idx_reviews_product_rating IS 'Muestra reseñas ordenadas por rating';

CREATE INDEX idx_customers_email_lower 
ON customers(LOWER(email));
COMMENT ON INDEX idx_customers_email_lower IS 'Login de clientes sin importar mayúsculas';

CREATE INDEX idx_orders_month 
ON orders(DATE_TRUNC('month', order_date));
COMMENT ON INDEX idx_orders_month IS 'Agrupación de ventas por mes para reportes';

-- Índices para autenticación y checkout invitado
CREATE INDEX idx_customers_google_id 
ON customers(google_id) 
WHERE google_id IS NOT NULL;
COMMENT ON INDEX idx_customers_google_id IS 'Login con Google OAuth';

CREATE INDEX idx_customers_facebook_id 
ON customers(facebook_id) 
WHERE facebook_id IS NOT NULL;
COMMENT ON INDEX idx_customers_facebook_id IS 'Login con Facebook OAuth';

CREATE INDEX idx_orders_guest_email 
ON orders(LOWER(guest_email)) 
WHERE guest_email IS NOT NULL;
COMMENT ON INDEX idx_orders_guest_email IS 'Búsqueda de órdenes por email de invitado';

CREATE INDEX idx_reset_token_active 
ON password_reset_tokens(token, expires_at) 
WHERE used = FALSE;
COMMENT ON INDEX idx_reset_token_active IS 'Validación rápida de tokens activos';

-- ========================================
-- VISTAS (8 vistas documentadas)
-- ========================================

CREATE VIEW view_sales_by_category AS
SELECT 
    c.category_id,
    c.category_name,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.unit_price) AS revenue
FROM categories c
LEFT JOIN products p ON c.category_id = p.category_id
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.order_id
WHERE o.status != 'Cancelado' OR o.status IS NULL
GROUP BY c.category_id, c.category_name
ORDER BY revenue DESC NULLS LAST;

COMMENT ON VIEW view_sales_by_category IS 'Analítica: Revenue e items vendidos por categoría';

CREATE VIEW view_monthly_revenue AS
SELECT 
    DATE_TRUNC('month', o.order_date) AS month,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(o.total) AS revenue,
    ROUND(AVG(o.total), 2) AS avg_order_value,
    COUNT(DISTINCT o.customer_id) AS unique_customers
FROM orders o
WHERE o.status != 'Cancelado'
GROUP BY DATE_TRUNC('month', o.order_date)
ORDER BY month DESC;

COMMENT ON VIEW view_monthly_revenue IS 'Analítica: Métricas mensuales de ventas';

CREATE VIEW view_top_products AS
SELECT 
    p.product_id,
    p.product_name,
    c.category_name,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.unit_price) AS revenue,
    p.stock AS current_stock
FROM products p
JOIN categories c ON p.category_id = c.category_id
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.order_id
WHERE o.status != 'Cancelado' OR o.status IS NULL
GROUP BY p.product_id, p.product_name, c.category_name, p.stock
ORDER BY units_sold DESC NULLS LAST
LIMIT 10;

COMMENT ON VIEW view_top_products IS 'Analítica: Productos más vendidos';

CREATE VIEW view_customer_lifetime_value AS
SELECT 
    c.customer_id,
    c.email,
    c.first_name || ' ' || c.last_name AS full_name,
    COUNT(o.order_id) AS total_orders,
    SUM(o.total) AS lifetime_value,
    ROUND(AVG(o.total), 2) AS avg_order_value,
    MAX(o.order_date) AS last_order_date
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE o.status != 'Cancelado' OR o.status IS NULL
GROUP BY c.customer_id, c.email, full_name
ORDER BY lifetime_value DESC NULLS LAST;

COMMENT ON VIEW view_customer_lifetime_value IS 'Analítica: Valor total por cliente';

CREATE VIEW view_low_stock_products AS
SELECT 
    p.product_id,
    p.product_name,
    c.category_name,
    p.stock,
    p.price,
    COALESCE(SUM(oi.quantity), 0) AS sold_last_30_days
FROM products p
JOIN categories c ON p.category_id = c.category_id
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.order_id 
    AND o.order_date >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    AND o.status != 'Cancelado'
WHERE p.is_active = TRUE AND p.stock < 10
GROUP BY p.product_id, p.product_name, c.category_name, p.stock, p.price
ORDER BY p.stock ASC;

COMMENT ON VIEW view_low_stock_products IS 'Analítica: Productos con stock < 10 unidades';

CREATE VIEW view_pending_orders AS
SELECT 
    o.order_id,
    o.order_date,
    COALESCE(
        c.first_name || ' ' || c.last_name, 
        o.guest_name, 
        'Invitado'
    ) AS customer_name,
    COALESCE(c.email, o.guest_email) AS email,
    o.total,
    o.currency_code,
    o.status,
    o.shipping_status,
    ci.city_name,
    co.country_name,
    CASE WHEN o.customer_id IS NULL THEN TRUE ELSE FALSE END AS is_guest
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN customer_addresses ca ON o.shipping_address_id = ca.address_id
LEFT JOIN cities ci ON ca.city_id = ci.city_id
LEFT JOIN countries co ON ci.country_id = co.country_id
WHERE o.status IN ('Pendiente', 'Procesando')
ORDER BY o.order_date DESC;

COMMENT ON VIEW view_pending_orders IS 'Panel: Órdenes pendientes de procesar';

CREATE VIEW view_payment_status_summary AS
SELECT 
    p.status,
    COUNT(*) AS total_payments,
    SUM(p.amount) AS total_amount,
    ROUND(AVG(p.amount), 2) AS avg_amount
FROM payments p
GROUP BY p.status
ORDER BY total_amount DESC;

COMMENT ON VIEW view_payment_status_summary IS 'Analítica: Resumen de pagos por estado';

CREATE VIEW view_shipping_zones_revenue AS
SELECT 
    sz.zone_name,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(o.total) AS revenue
FROM shipping_zones sz
LEFT JOIN cities ci ON ci.country_id = ANY(
    SELECT country_id FROM countries 
    WHERE country_code = ANY(sz.countries)
)
LEFT JOIN customer_addresses ca ON ca.city_id = ci.city_id
LEFT JOIN orders o ON o.shipping_address_id = ca.address_id
WHERE o.status != 'Cancelado' OR o.status IS NULL
GROUP BY sz.zone_name
ORDER BY revenue DESC NULLS LAST;

COMMENT ON VIEW view_shipping_zones_revenue IS 'Analítica: Ventas por zona de envío';

-- ========================================
-- DATOS INICIALES
-- ========================================

INSERT INTO currencies (currency_code, currency_name, symbol) VALUES
('GTQ', 'Quetzal Guatemalteco', 'Q'),
('USD', 'Dólar Estadounidense', '$');

INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
('GTQ', 'USD', 0.128),
('USD', 'GTQ', 7.80);

INSERT INTO shipping_zones (zone_name, countries) VALUES
('Guatemala', ARRAY['GTM']),
('Estados Unidos', ARRAY['USA']),
('Centroamérica', ARRAY['SLV', 'HND', 'NIC', 'CRI', 'PAN', 'BLZ']);

INSERT INTO shipping_rates (zone_id, min_weight, max_weight, base_cost, cost_per_kg, estimated_days) VALUES
(1, 0, 5, 25.00, 5.00, 3),
(1, 5, NULL, 50.00, 8.00, 5),
(2, 0, 5, 150.00, 25.00, 10),
(2, 5, NULL, 250.00, 40.00, 15),
(3, 0, 5, 75.00, 15.00, 7),
(3, 5, NULL, 125.00, 20.00, 10);

-- ========================================
-- FUNCIÓN DE LIMPIEZA AUTOMÁTICA
-- ========================================

DROP FUNCTION IF EXISTS cleanup_abandoned_guest_carts();

CREATE FUNCTION cleanup_abandoned_guest_carts()
RETURNS void 
LANGUAGE plpgsql
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cart_items 
    WHERE customer_id IS NULL 
      AND updated_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🧹 Limpieza: % items eliminados', deleted_count;
    
    DELETE FROM "session" WHERE expire < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Limpieza: % sesiones eliminadas', deleted_count;
END;
$function$;

COMMENT ON FUNCTION cleanup_abandoned_guest_carts() IS 
'Limpia carritos de invitados > 30 días y sesiones expiradas';

-- ========================================
-- FIN DEL SCHEMA
-- ========================================