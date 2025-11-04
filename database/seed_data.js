// ========================================
// ARTESANÍAS SUNSET - SEED DATA FINAL
// Archivo: database/seed_data.js
// ========================================

import { faker } from '@faker-js/faker';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'artesanias_sunset',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password'
});

const CONFIG = {
  COUNTRIES: 10,
  CITIES_PER_COUNTRY: 10,
  CUSTOMERS: 500,
  EMPLOYEES: 5,
  CATEGORIES: 15,
  PRODUCTS: 2000,
  ORDERS: 5000,
  PAYMENTS: 3000
};

const IDs = {
  countries: [],
  cities: [],
  guatemalanCities: [],
  customers: [],
  employees: [],
  categories: [],
  products: [],
  productVariants: [],
  orders: [],
  addresses: [],
  promotions: [],
  shippingRates: []
};

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const randomElement = (array) => array[Math.floor(Math.random() * array.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const GUATEMALA_DATA = {
  countries: [
    { code: 'GTM', name: 'Guatemala' },
    { code: 'SLV', name: 'El Salvador' },
    { code: 'HND', name: 'Honduras' },
    { code: 'NIC', name: 'Nicaragua' },
    { code: 'CRI', name: 'Costa Rica' },
    { code: 'PAN', name: 'Panamá' },
    { code: 'BLZ', name: 'Belice' },
    { code: 'MEX', name: 'México' },
    { code: 'USA', name: 'USA' },
    { code: 'CAN', name: 'Canadá' }
  ],
  
  guatemalanCities: [
    'Guatemala', 'Antigua', 'Xela', 'Escuintla', 'Mazatenango',
    'Cobán', 'Huehue', 'Jalapa', 'Chiquimula', 'Reu',
    'Sololá', 'Chichi', 'Pana', 'San Marcos', 'Toto',
    'Jutiapa', 'Quiché', 'Zacapa', 'Chimal', 'Petén'
  ],
  
  categories: [
    { name: 'Joyería', desc: 'Collares, aretes, pulseras artesanales', weight: 0.2, volume: 0.001, price: [100, 800] },
    { name: 'Joyería de Plata', desc: 'Piezas de plata 925', weight: 0.15, volume: 0.0008, price: [300, 1500] },
    { name: 'Joyería de Jade', desc: 'Jade guatemalteco auténtico', weight: 0.25, volume: 0.001, price: [500, 3000] },
    { name: 'Textiles', desc: 'Tejidos tradicionales guatemaltecos', weight: 0.8, volume: 0.005, price: [150, 800] },
    { name: 'Textiles Mayas', desc: 'Textiles con patrones mayas', weight: 0.9, volume: 0.005, price: [200, 1000] },
    { name: 'Ropa', desc: 'Ropa tradicional y moderna', weight: 0.5, volume: 0.004, price: [180, 900] },
    { name: 'Huipiles', desc: 'Blusas tradicionales bordadas', weight: 0.4, volume: 0.003, price: [250, 1200] },
    { name: 'Cortes', desc: 'Faldas tradicionales', weight: 0.6, volume: 0.004, price: [200, 800] },
    { name: 'Cerámica', desc: 'Piezas de cerámica artesanal', weight: 1.5, volume: 0.008, price: [80, 500] },
    { name: 'Cerámica Vidriada', desc: 'Cerámica con acabado vidriado', weight: 1.8, volume: 0.009, price: [100, 600] },
    { name: 'Cerámica Decorativa', desc: 'Piezas decorativas', weight: 2.0, volume: 0.01, price: [120, 700] },
    { name: 'Bolsas y Accesorios', desc: 'Bolsas y accesorios tejidos', weight: 0.3, volume: 0.002, price: [100, 600] },
    { name: 'Máscaras', desc: 'Máscaras ceremoniales', weight: 1.2, volume: 0.007, price: [150, 900] },
    { name: 'Madera Tallada', desc: 'Figuras talladas en madera', weight: 1.0, volume: 0.006, price: [180, 1000] },
    { name: 'Decoración del Hogar', desc: 'Artículos decorativos', weight: 1.3, volume: 0.007, price: [120, 850] }
  ],
  
  productNames: {
    'Joyería': ['Collar de Jade Verde', 'Aretes de Plata', 'Pulsera Tejida', 'Anillo de Jade', 'Collar de Cuentas', 'Aretes Colgantes', 'Pulsera de Hilo', 'Pendientes Largos'],
    'Joyería de Plata': ['Collar de Plata 925', 'Aretes de Plata Esterlina', 'Pulsera de Plata', 'Anillo de Plata con Jade', 'Cadena de Plata', 'Dije de Plata'],
    'Joyería de Jade': ['Collar de Jade Imperial', 'Aretes de Jade Natural', 'Pulsera de Jade Tallado', 'Anillo de Jade Verde', 'Dije de Jade Guatemalteco'],
    'Textiles': ['Camino de Mesa Típico', 'Mantel Bordado', 'Bufanda de Algodón', 'Cojín Decorativo', 'Manta Tejida', 'Tapete de Mesa', 'Servilletas Bordadas'],
    'Textiles Mayas': ['Camino de Mesa Maya', 'Mantel con Diseños Mayas', 'Cojín con Símbolos Mayas', 'Tapiz Maya', 'Manta con Patrones Tradicionales'],
    'Ropa': ['Blusa Bordada', 'Camisa de Algodón', 'Vestido Típico', 'Falda Tradicional', 'Chaleco Bordado', 'Poncho Artesanal'],
    'Huipiles': ['Huipil de Chichicastenango', 'Huipil de Sololá', 'Huipil Bordado a Mano', 'Huipil de Totonicapán', 'Huipil Ceremonial', 'Huipil de San Pedro'],
    'Cortes': ['Corte Típico de Sololá', 'Corte de Algodón', 'Corte Tradicional', 'Corte Jaspeado', 'Corte de Chichicastenango', 'Corte Ceremonial'],
    'Cerámica': ['Jarrón de Barro', 'Taza Artesanal', 'Plato Decorativo', 'Bowl de Cerámica', 'Florero de Barro', 'Jarra de Cerámica', 'Vasija Tradicional'],
    'Cerámica Vidriada': ['Jarrón Vidriado', 'Plato Vidriado', 'Taza con Esmalte', 'Bowl Esmaltado'],
    'Cerámica Decorativa': ['Figura de Barro', 'Adorno Cerámico', 'Escultura de Cerámica', 'Pieza Decorativa'],
    'Bolsas y Accesorios': ['Bolsa Tejida', 'Morral Artesanal', 'Cartera Bordada', 'Monedero de Tela', 'Bolsa de Mano', 'Mochila Típica', 'Neceser Bordado'],
    'Máscaras': ['Máscara de Baile', 'Máscara Ceremonial', 'Máscara Decorativa', 'Máscara de Conquista', 'Máscara Tallada', 'Máscara Tradicional'],
    'Madera Tallada': ['Figura de Quetzal', 'Santo Tallado', 'Escultura de Madera', 'Ángel de Madera', 'Cruz Tallada', 'Figura Religiosa', 'Animal Tallado'],
    'Decoración del Hogar': ['Espejo Decorativo', 'Candelabro Artesanal', 'Portarretrato Bordado', 'Reloj de Pared', 'Cuadro Decorativo', 'Lámpara Artesanal']
  },
  
  adjectives: ['Tradicional', 'Típico', 'Artesanal', 'Hecho a Mano', 'Multicolor', 'Bordado', 'Tejido', 'Pintado', 'Natural', 'Auténtico', 'Original', 'Pequeño', 'Mediano', 'Grande'],
  
  categoriesWithVariants: ['Ropa', 'Huipiles', 'Cortes', 'Textiles', 'Textiles Mayas', 'Bolsas y Accesorios'],
  
  sizes: ['S', 'M', 'L', 'XL'],
  colors: ['Rojo', 'Azul', 'Verde', 'Amarillo', 'Negro', 'Blanco', 'Morado', 'Rosa']
};

// ========================================
// FUNCIONES DE SEED
// ========================================

async function seedCountries() {
  log('Insertando países...');
  for (const country of GUATEMALA_DATA.countries) {
    const result = await pool.query(
      'INSERT INTO countries (country_code, country_name) VALUES ($1, $2) RETURNING country_id',
      [country.code, country.name]
    );
    IDs.countries.push(result.rows[0].country_id);
  }
  log(`✅ ${IDs.countries.length} países insertados`);
}

async function seedCities() {
  log('Insertando ciudades...');
  
  const guatemalaId = IDs.countries[0];
  for (const cityName of GUATEMALA_DATA.guatemalanCities) {
    const result = await pool.query(
      'INSERT INTO cities (city_name, country_id) VALUES ($1, $2) RETURNING city_id',
      [cityName, guatemalaId]
    );
    IDs.guatemalanCities.push(result.rows[0].city_id);
    IDs.cities.push(result.rows[0].city_id);
  }
  
  const otherCities = ['San Salvador', 'Tegucigalpa', 'Managua', 'San José', 'Panamá', 'Belize', 'Cancún', 'New York', 'LA', 'Miami', 'Houston', 'Chicago', 'Toronto', 'Vancouver', 'Monterrey'];
  
  for (let i = 1; i < IDs.countries.length; i++) {
    const numCities = 10;
    for (let j = 0; j < numCities; j++) {
      let cityName = (i - 1) * 10 + j < otherCities.length 
        ? otherCities[(i - 1) * 10 + j]
        : faker.location.city().substring(0, 20);
      
      const result = await pool.query(
        'INSERT INTO cities (city_name, country_id) VALUES ($1, $2) RETURNING city_id',
        [cityName, IDs.countries[i]]
      );
      IDs.cities.push(result.rows[0].city_id);
    }
  }
  log(`✅ ${IDs.cities.length} ciudades insertadas`);
}

async function seedCustomers() {
  log('Insertando clientes...');
  for (let i = 0; i < CONFIG.CUSTOMERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase().substring(0, 50);
    const passwordHash = '$2b$10$' + faker.string.alphanumeric(53);
    const phone = faker.phone.number().substring(0, 20);
    
    const cityId = Math.random() < 0.75 
      ? randomElement(IDs.guatemalanCities)
      : randomElement(IDs.cities);
    
    const result = await pool.query(
      `INSERT INTO customers 
       (email, password_hash, first_name, last_name, phone, city_id, last_login)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING customer_id`,
      [email, passwordHash, firstName, lastName, phone, cityId, 
       Math.random() < 0.8 ? faker.date.recent({ days: 30 }) : null]
    );
    IDs.customers.push(result.rows[0].customer_id);
    
    if ((i + 1) % 100 === 0) log(`  → ${i + 1}/${CONFIG.CUSTOMERS} clientes`);
  }
  log(`✅ ${IDs.customers.length} clientes insertados`);
}

async function seedEmployees() {
  log('Insertando empleados...');
  const roles = ['Admin', 'Developer', 'Support', 'Support', 'Support'];
  const names = ['María José González', 'André Morales', 'Carlos Pérez', 'Ana Martínez', 'Luis Rodríguez'];
  
  for (let i = 0; i < CONFIG.EMPLOYEES; i++) {
    const email = `${names[i].split(' ')[0].toLowerCase()}@artesaniassunset.com`;
    const passwordHash = '$2b$10$' + faker.string.alphanumeric(53);
    
    const result = await pool.query(
      `INSERT INTO employees (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4) RETURNING employee_id`,
      [email, passwordHash, names[i], roles[i]]
    );
    IDs.employees.push(result.rows[0].employee_id);
  }
  log(`✅ ${IDs.employees.length} empleados insertados`);
}

async function seedCategories() {
  log('Insertando categorías...');
  for (const category of GUATEMALA_DATA.categories) {
    const slug = category.name.toLowerCase().replace(/ /g, '-');
    const result = await pool.query(
      `INSERT INTO categories (category_name, description, slug, meta_title, meta_description)
       VALUES ($1, $2, $3, $4, $5) RETURNING category_id`,
      [category.name, category.desc, slug, category.name, category.desc]
    );
    IDs.categories.push({ id: result.rows[0].category_id, ...category });
  }
  log(`✅ ${IDs.categories.length} categorías insertadas`);
}

async function seedProducts() {
  log('Insertando productos...');
  
  const descriptions = [
    'Producto artesanal guatemalteco hecho a mano por artesanos locales con técnicas tradicionales',
    'Pieza única elaborada con técnicas ancestrales mayas transmitidas de generación en generación',
    'Artesanía tradicional de alta calidad que representa la cultura guatemalteca',
    'Hecho a mano con materiales naturales de Guatemala por artesanos experimentados',
    'Producto auténtico que preserva tradiciones ancestrales de nuestros pueblos',
    'Elaborado por artesanos guatemaltecos con años de experiencia en el oficio',
    'Pieza artesanal que combina técnicas tradicionales con diseños contemporáneos'
  ];
  
  let productsWithNoStock = 0;
  const targetNoStock = Math.floor(CONFIG.PRODUCTS * 0.05);
  
  for (let i = 0; i < CONFIG.PRODUCTS; i++) {
    const category = randomElement(IDs.categories);
    const baseNames = GUATEMALA_DATA.productNames[category.name] || ['Artesanía'];
    const baseName = randomElement(baseNames);
    
    const productName = Math.random() > 0.5 
      ? `${baseName} ${randomElement(GUATEMALA_DATA.adjectives)}`
      : baseName;
    
    const description = randomElement(descriptions);
    const price = faker.number.float({ 
      min: category.price[0], 
      max: category.price[1], 
      fractionDigits: 2 
    });
    
    const wholesalePrice = price * faker.number.float({ min: 0.70, max: 0.85, fractionDigits: 2 });
    
    let stock;
    if (productsWithNoStock < targetNoStock && Math.random() < 0.05) {
      stock = 0;
      productsWithNoStock++;
    } else {
      stock = randomInt(10, 200);
    }
    
    let slug = productName.toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    slug = `${slug}-${i}`;
    
    const result = await pool.query(
      `INSERT INTO products 
       (product_name, description, category_id, price, wholesale_price, stock, weight, volume, slug, meta_title, meta_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING product_id`,
      [productName, description, category.id, price, wholesalePrice, stock, 
       category.weight, category.volume, slug, productName, description.substring(0, 160)]
    );
    
    IDs.products.push({ 
      id: result.rows[0].product_id, 
      categoryName: category.name,
      price: price
    });
    
    if ((i + 1) % 500 === 0) log(`  → ${i + 1}/${CONFIG.PRODUCTS} productos`);
  }
  log(`✅ ${IDs.products.length} productos insertados (${productsWithNoStock} sin stock)`);
}

async function seedProductVariants() {
  log('Insertando variantes...');
  let count = 0;
  
  const productsWithVariants = IDs.products.filter(p => 
    GUATEMALA_DATA.categoriesWithVariants.includes(p.categoryName) && Math.random() < 0.7
  );
  
  for (const product of productsWithVariants) {
    const selectedSizes = [randomElement(GUATEMALA_DATA.sizes), randomElement(GUATEMALA_DATA.sizes)];
    const selectedColors = [randomElement(GUATEMALA_DATA.colors), randomElement(GUATEMALA_DATA.colors)];
    
    for (const size of selectedSizes) {
      for (const color of selectedColors) {
        const variantName = `${size} - ${color}`;
        const sku = `VAR-${product.id}-${size}-${color.substring(0,3).toUpperCase()}`;
        const additionalPrice = faker.number.float({ min: 0, max: 50, fractionDigits: 2 });
        
        try {
          const result = await pool.query(
            `INSERT INTO product_variants 
             (product_id, variant_name, sku, size, color, additional_price, stock)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING variant_id`,
            [product.id, variantName, sku, size, color, additionalPrice, randomInt(5, 100)]
          );
          IDs.productVariants.push(result.rows[0].variant_id);
          count++;
        } catch (error) {
          // Ignorar duplicados
        }
      }
    }
  }
  log(`✅ ${count} variantes insertadas para ${productsWithVariants.length} productos`);
}

async function seedProductReviews() {
  log('Insertando reseñas...');
  let count = 0;
  
  const productsWithReviews = IDs.products.filter(() => Math.random() < 0.2);
  
  const reviewTexts = [
    'Excelente calidad, muy bien hecho y los colores son hermosos',
    'Me encantó, es tal cual se ve en las fotos',
    'Producto auténtico y de muy buena calidad',
    'Hermoso trabajo artesanal, totalmente recomendado',
    'Llegó en perfecto estado, el acabado es impecable',
    'Muy contenta con mi compra, superó mis expectativas',
    'Producto bonito pero esperaba un poco más de detalle',
    'Buena calidad por el precio',
    'Es lindo pero los colores son un poco diferentes a la foto',
    'Excelente artesanía guatemalteca, vale la pena'
  ];
  
  for (const product of productsWithReviews) {
    const numReviews = randomInt(1, 5);
    for (let i = 0; i < numReviews; i++) {
      const customerId = randomElement(IDs.customers);
      
      let rating;
      const rand = Math.random();
      if (rand < 0.7) {
        rating = randomInt(4, 5);
      } else if (rand < 0.9) {
        rating = 3;
      } else {
        rating = randomInt(1, 2);
      }
      
      const reviewText = randomElement(reviewTexts);
      const isVerified = Math.random() > 0.4;
      const isApproved = Math.random() > 0.2;
      
      try {
        await pool.query(
          `INSERT INTO product_reviews 
           (product_id, customer_id, rating, review_text, is_verified_purchase, is_approved)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [product.id, customerId, rating, reviewText, isVerified, isApproved]
        );
        count++;
      } catch (error) {
        // Ignorar duplicados
      }
    }
  }
  log(`✅ ${count} reseñas insertadas`);
}

async function seedCustomerAddresses() {
  log('Insertando direcciones...');
  let count = 0;
  
  for (const customerId of IDs.customers) {
    const addressCount = randomInt(1, 3);
    for (let i = 0; i < addressCount; i++) {
      const result = await pool.query(
        `INSERT INTO customer_addresses 
         (customer_id, city_id, address_line, is_default, address_type)
         VALUES ($1, $2, $3, $4, $5) RETURNING address_id`,
        [customerId, randomElement(IDs.cities), 
         faker.location.streetAddress(true), 
         i === 0, 
         randomElement(['Residencial', 'Comercial', 'Trabajo'])]
      );
      IDs.addresses.push(result.rows[0].address_id);
      count++;
    }
  }
  log(`✅ ${count} direcciones insertadas`);
}

async function seedPromotions() {
  log('Insertando promociones...');
  const promos = [
    { code: 'SUNSET', desc: '15% descuento compras', type: 'percentage', value: 15, min: 200 },
    { code: '2025', desc: '10% descuento año nuevo', type: 'percentage', value: 10, min: 100 },
    { code: 'MAJO', desc: 'Q50 descuento', type: 'fixed', value: 50, min: 300 },
    { code: 'ANDRE', desc: '20% descuento especial', type: 'percentage', value: 20, min: 500 }
  ];
  
  for (const promo of promos) {
    const result = await pool.query(
      `INSERT INTO promotions 
       (promo_code, description, discount_type, discount_value, min_purchase, max_uses, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING promo_id`,
      [promo.code, promo.desc, promo.type, promo.value, promo.min,
       randomInt(50, 200),
       faker.date.future()]
    );
    IDs.promotions.push(result.rows[0].promo_id);
  }
  log(`✅ ${promos.length} promociones insertadas`);
}

async function getShippingRates() {
  log('Obteniendo tarifas de envío...');
  const result = await pool.query('SELECT rate_id FROM shipping_rates');
  IDs.shippingRates = result.rows.map(row => row.rate_id);
  log(`✅ ${IDs.shippingRates.length} tarifas de envío disponibles`);
}

async function seedOrders() {
  log('Insertando órdenes...');
  const statuses = ['Pendiente', 'Procesando', 'Enviado', 'Entregado', 'Cancelado'];
  const weights = [10, 15, 20, 50, 5];
  
  for (let i = 0; i < CONFIG.ORDERS; i++) {
    const customerId = randomElement(IDs.customers);
    const employeeId = Math.random() > 0.3 ? randomElement(IDs.employees) : null;
    
    const addressResult = await pool.query(
      'SELECT address_id, city_id FROM customer_addresses WHERE customer_id = $1 LIMIT 1',
      [customerId]
    );
    const shippingAddressId = addressResult.rows[0]?.address_id || null;
    const cityId = addressResult.rows[0]?.city_id;
    
    // Determinar moneda basada en la ciudad del cliente
    let currencyCode = 'GTQ';
    if (cityId) {
      const countryResult = await pool.query(
        'SELECT co.country_code FROM cities ci JOIN countries co ON ci.country_id = co.country_id WHERE ci.city_id = $1',
        [cityId]
      );
      if (countryResult.rows.length > 0) {
        const countryCode = countryResult.rows[0].country_code;
        // 70% de probabilidad de usar USD si el país es USA o Canadá
        if ((countryCode === 'USA' || countryCode === 'CAN') && Math.random() < 0.7) {
          currencyCode = 'USD';
        }
      }
    }
    
    const orderDate = faker.date.between({ from: '2024-01-01', to: new Date() });
    
    let random = Math.random() * 100;
    let status = statuses[0];
    let cumulative = 0;
    for (let j = 0; j < weights.length; j++) {
      cumulative += weights[j];
      if (random <= cumulative) { 
        status = statuses[j]; 
        break; 
      }
    }
    
    const shippingStatus = status === 'Enviado' ? 'En tránsito' 
      : status === 'Entregado' ? 'Entregado'
      : 'Preparando';
    
    const trackingNumber = status === 'Enviado' || status === 'Entregado'
      ? 'GT' + faker.string.alphanumeric(12).toUpperCase()
      : null;
    
    const promoId = Math.random() < 0.3 && IDs.promotions.length > 0
      ? randomElement(IDs.promotions)
      : null;
    
    const shippingRateId = Math.random() < 0.8 && IDs.shippingRates.length > 0
      ? randomElement(IDs.shippingRates)
      : null;
    
    const shippingCost = shippingRateId 
      ? faker.number.float({ min: 25, max: 150, fractionDigits: 2 })
      : 0;
    
    const result = await pool.query(
      `INSERT INTO orders 
       (customer_id, employee_id, shipping_address_id, order_date, status, shipping_status, 
        tracking_number, total, currency_code, promo_id, discount_applied, shipping_rate_id, shipping_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, 0, $10, $11) RETURNING order_id`,
      [customerId, employeeId, shippingAddressId, orderDate, status, shippingStatus, 
       trackingNumber, currencyCode, promoId, shippingRateId, shippingCost]
    );
    IDs.orders.push(result.rows[0].order_id);
    
    if ((i + 1) % 1000 === 0) log(`  → ${i + 1}/${CONFIG.ORDERS} órdenes`);
  }
  log(`✅ ${IDs.orders.length} órdenes insertadas`);
}

async function seedOrderItems() {
  log('Insertando items de órdenes...');
  let totalItems = 0;
  
  for (const orderId of IDs.orders) {
    const itemCount = randomInt(1, 5);
    let orderTotal = 0;
    
    // Obtener la moneda de la orden
    const orderResult = await pool.query(
      'SELECT currency_code FROM orders WHERE order_id = $1',
      [orderId]
    );
    const currencyCode = orderResult.rows[0].currency_code;
    
    for (let i = 0; i < itemCount; i++) {
      const product = randomElement(IDs.products);
      const quantity = randomInt(1, 3);
      let unitPrice = product.price;
      
      // Convertir precio si la orden es en USD
      if (currencyCode === 'USD') {
        unitPrice = unitPrice * 0.128; // GTQ a USD
      }
      
      let variantId = null;
      if (Math.random() < 0.4 && IDs.productVariants.length > 0) {
        const variantResult = await pool.query(
          'SELECT variant_id FROM product_variants WHERE product_id = $1 LIMIT 1',
          [product.id]
        );
        if (variantResult.rows.length > 0) {
          variantId = variantResult.rows[0].variant_id;
        }
      }
      
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, variant_id, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)',
        [orderId, product.id, variantId, quantity, unitPrice]
      );
      
      orderTotal += quantity * parseFloat(unitPrice);
      totalItems++;
    }
    
    // Calcular descuento si hay promoción
    const promoResult = await pool.query(
      'SELECT promo_id FROM orders WHERE order_id = $1',
      [orderId]
    );
    
    let discountApplied = 0;
    if (promoResult.rows[0].promo_id) {
      const promoDetails = await pool.query(
        'SELECT discount_type, discount_value FROM promotions WHERE promo_id = $1',
        [promoResult.rows[0].promo_id]
      );
      
      if (promoDetails.rows.length > 0) {
        const { discount_type, discount_value } = promoDetails.rows[0];
        if (discount_type === 'percentage') {
          discountApplied = orderTotal * (parseFloat(discount_value) / 100);
        } else {
          // Convertir descuento fijo si la orden es en USD
          let fixedDiscount = parseFloat(discount_value);
          if (currencyCode === 'USD') {
            fixedDiscount = fixedDiscount * 0.128;
          }
          discountApplied = fixedDiscount;
        }
      }
    }
    
    const finalTotal = orderTotal - discountApplied;
    
    await pool.query(
      'UPDATE orders SET total = $1, discount_applied = $2 WHERE order_id = $3', 
      [finalTotal, discountApplied, orderId]
    );
  }
  log(`✅ ${totalItems} items de órdenes insertados`);
}

async function seedPayments() {
  log('Insertando pagos...');
  const methods = ['Efectivo', 'Tarjeta', 'Transferencia', 'PayPal'];
  const statuses = ['Aprobado', 'Aprobado', 'Aprobado', 'Aprobado', 'Pendiente', 'Rechazado'];
  
  const ordersForPayment = [];
  for (let i = 0; i < CONFIG.PAYMENTS; i++) {
    ordersForPayment.push(randomElement(IDs.orders));
  }
  
  for (const orderId of ordersForPayment) {
    const orderResult = await pool.query(
      'SELECT total, order_date FROM orders WHERE order_id = $1',
      [orderId]
    );
    const { total, order_date } = orderResult.rows[0];
    const paymentDate = new Date(order_date.getTime() + randomInt(0, 86400000));
    const status = randomElement(statuses);
    
    await pool.query(
      `INSERT INTO payments (order_id, payment_date, payment_method, amount, status, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, paymentDate, randomElement(methods), total, status,
       status === 'Aprobado' ? 'TXN-' + faker.string.alphanumeric(15).toUpperCase() : null]
    );
  }
  log(`✅ ${CONFIG.PAYMENTS} pagos insertados`);
}

async function main() {
  try {
    console.log('\n========================================');
    console.log('🌟 ARTESANÍAS SUNSET - SEED DATA');
    console.log('========================================\n');
    
    log('Conectando...');
    await pool.query('SELECT NOW()');
    log('✅ Conectado\n');
    
    await seedCountries();
    await seedCities();
    await seedCustomers();
    await seedEmployees();
    await seedCategories();
    await seedProducts();
    await seedProductVariants();
    await seedProductReviews();
    await seedCustomerAddresses();
    await seedPromotions();
    await getShippingRates();
    await seedOrders();
    await seedOrderItems();
    await seedPayments();
    
    console.log('\n========================================');
    console.log('✅ PROCESO COMPLETADO');
    console.log('========================================');
    console.log('\n📊 RESUMEN:');
    console.log(`  • ${IDs.countries.length} países`);
    console.log(`  • ${IDs.cities.length} ciudades`);
    console.log(`  • ${IDs.customers.length} clientes`);
    console.log(`  • ${IDs.employees.length} empleados`);
    console.log(`  • ${IDs.categories.length} categorías`);
    console.log(`  • ${IDs.products.length} productos`);
    console.log(`  • ${IDs.productVariants.length} variantes`);
    console.log(`  • ${IDs.promotions.length} promociones`);
    console.log(`  • ${IDs.orders.length} órdenes`);
    console.log(`  • ${IDs.addresses.length} direcciones`);
    
    // Mostrar estadísticas de monedas
    const currencyStats = await pool.query(
      'SELECT currency_code, COUNT(*) as total FROM orders GROUP BY currency_code ORDER BY currency_code'
    );
    console.log('\n💱 ÓRDENES POR MONEDA:');
    for (const row of currencyStats.rows) {
      console.log(`  • ${row.currency_code}: ${row.total} órdenes`);
    }
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();