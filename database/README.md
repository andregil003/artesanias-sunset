# 🗄️ Base de Datos - Artesanías Sunset

## 📋 Contenido

Este directorio contiene la configuración completa de la base de datos:

- **`schema.sql`** - Estructura completa (17 tablas, 24 FKs, 8 índices, 8 vistas)
- **`seed_data.js`** - Script para generar ~26,000 registros de prueba
- **`README.md`** - Este archivo con instrucciones

---

## 🚀 Instalación y Configuración

### 1️⃣ **Requisitos Previos**

- PostgreSQL 14+ instalado
- pgAdmin4 (opcional, pero recomendado)
- Node.js 16+ instalado
- npm o yarn

### 2️⃣ **Instalar Dependencias**

Desde la raíz del proyecto, ejecuta:

```bash
npm install
```

Esto instalará:
- `pg` - Cliente de PostgreSQL para Node.js
- `@faker-js/faker` - Generador de datos falsos
- `dotenv` - Variables de entorno

Si no las tienes, instálalas manualmente:

```bash
npm install pg @faker-js/faker dotenv
```

### 3️⃣ **Configurar Variables de Entorno**

Edita tu archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=artesanias_sunset
DB_USER=postgres
DB_PASSWORD=tu_password_aqui

# Sesión
SESSION_SECRET=tu_secret_aqui
```

---

## 📊 Ejecutar el Schema (Crear Tablas)

### **Opción A: Usando pgAdmin4** (Recomendado)

1. Abre **pgAdmin4**
2. Crea la base de datos (si no existe):
   - Click derecho en "Databases" → "Create" → "Database"
   - Nombre: `artesanias_sunset`
   - Click "Save"

3. Abre **Query Tool**:
   - Click derecho en `artesanias_sunset` → "Query Tool"

4. Copia y pega **TODO** el contenido de `schema.sql`

5. Ejecuta el script:
   - Click en el botón **▶️ Execute** (o presiona F5)
   - Espera unos segundos

6. Verifica que se creó correctamente:

```sql
-- Ver tablas creadas (debe mostrar 17)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Ver vistas creadas (debe mostrar 8)
SELECT COUNT(*) FROM information_schema.views 
WHERE table_schema = 'public';
```

### **Opción B: Usando terminal (psql)**

```bash
# Crear la base de datos
createdb artesanias_sunset

# Ejecutar el schema
psql -U postgres -d artesanias_sunset -f database/schema.sql
```

---

## 🌱 Generar Datos de Prueba

Una vez que las tablas estén creadas, genera los datos:

```bash
node database/seed_data.js
```

**Esto tomará entre 2-5 minutos** dependiendo de tu computadora.

Verás un output como:

```
========================================
🌟 ARTESANÍAS SUNSET - SEED DATA
========================================

[2025-01-05T...] Conectando a la base de datos...
[2025-01-05T...] ✅ Conexión exitosa

[2025-01-05T...] Insertando países...
[2025-01-05T...] ✅ 10 países insertados
[2025-01-05T...] Insertando ciudades...
[2025-01-05T...] ✅ 100 ciudades insertadas
...
========================================
🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!
========================================
```

---

## 🔍 Verificar los Datos

Ejecuta en pgAdmin4:

```sql
-- Ver conteo de todas las tablas
SELECT 
    table_name, 
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.table_name) as columns,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Ver registros por tabla
SELECT 'countries' as tabla, COUNT(*) as registros FROM countries
UNION ALL
SELECT 'cities', COUNT(*) FROM cities
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'shipments', COUNT(*) FROM shipments
UNION ALL
SELECT 'returns', COUNT(*) FROM returns
UNION ALL
SELECT 'wishlists', COUNT(*) FROM wishlists
UNION ALL
SELECT 'wishlist_items', COUNT(*) FROM wishlist_items
UNION ALL
SELECT 'customer_addresses', COUNT(*) FROM customer_addresses
UNION ALL
SELECT 'blog_posts', COUNT(*) FROM blog_posts;
```

---

## 📊 Probar las Vistas

```sql
-- Ver ventas por categoría
SELECT * FROM view_sales_by_category;

-- Ver top 10 productos
SELECT * FROM view_top_products;

-- Ver ingresos mensuales
SELECT * FROM view_monthly_revenue;

-- Ver productos con stock bajo
SELECT * FROM view_low_stock_products;

-- Ver órdenes pendientes de envío
SELECT * FROM view_pending_shipments;

-- Ver resumen de clientes
SELECT * FROM view_customer_orders LIMIT 10;

-- Ver ticket promedio
SELECT * FROM view_average_ticket LIMIT 10;

-- Ver rendimiento de proveedores
SELECT * FROM view_supplier_performance;
```

---

## 🔄 Limpiar y Reiniciar

Si necesitas empezar de nuevo:

### **Método 1: Re-ejecutar schema.sql**

El script `schema.sql` ya incluye los `DROP TABLE IF EXISTS`, así que solo ejecuta:

```bash
psql -U postgres -d artesanias_sunset -f database/schema.sql
node database/seed_data.js
```

### **Método 2: Eliminar y recrear la base de datos**

```bash
# Eliminar base de datos
dropdb artesanias_sunset

# Crear de nuevo
createdb artesanias_sunset

# Ejecutar schema
psql -U postgres -d artesanias_sunset -f database/schema.sql

# Generar datos
node database/seed_data.js
```

---

## 📈 Estructura de la Base de Datos

### **Tablas Principales (17 total)**

#### Geografía (2)
- `countries` - Países
- `cities` - Ciudades/departamentos

#### Personas (3)
- `customers` - Clientes registrados
- `suppliers` - Proveedores de artesanías
- `employees` - Empleados del sistema

#### Catálogo (4)
- `categories` - Categorías de productos
- `products` - Productos artesanales
- `product_images` - Imágenes de productos (vacía inicialmente)
- `category_images` - Banners de categorías (vacía inicialmente)

#### Ventas (3)
- `orders` - Órdenes de compra
- `order_items` - Detalle de productos en órdenes
- `payments` - Pagos realizados

#### Logística (2)
- `shipments` - Envíos de órdenes
- `returns` - Devoluciones

#### Otros (3)
- `customer_addresses` - Direcciones de clientes
- `wishlists` - Listas de deseos
- `wishlist_items` - Items en listas de deseos
- `blog_posts` - Artículos del blog

### **Índices (8)**

- 6 índices compuestos
- 2 índices sobre expresiones

### **Vistas (8)**

Consultas complejas pre-definidas para análisis

---

## ⚠️ Notas Importantes

1. **Las tablas `product_images` y `category_images` están vacías** - Se llenarán después con funcionalidad de subida de imágenes

2. **Los passwords son hashes simulados** - En producción, usa bcrypt real

3. **Los datos son de prueba** - No usar en producción

4. **Precios en Quetzales (GTQ)** - Rango: Q50 - Q3,000

---

## 🐛 Solución de Problemas

### Error: "relation does not exist"
- Asegúrate de ejecutar `schema.sql` antes de `seed_data.js`

### Error: "password authentication failed"
- Verifica las credenciales en tu archivo `.env`

### Error: "database does not exist"
- Crea la base de datos primero: `createdb artesanias_sunset`

### El script seed_data.js es muy lento
- Es normal, está insertando 26,000 registros
- En una máquina promedio toma 2-5 minutos

---

## ✅ Checklist Final

- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos `artesanias_sunset` creada
- [ ] Archivo `.env` configurado
- [ ] Dependencias npm instaladas
- [ ] `schema.sql` ejecutado exitosamente (17 tablas + 8 vistas)
- [ ] `seed_data.js` ejecutado exitosamente (~26,000 registros)
- [ ] Vistas funcionando correctamente

---