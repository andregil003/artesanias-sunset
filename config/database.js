// config/database.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Validar variables de entorno obligatorias
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
    process.exit(1);
}

// Configuración del pool de conexiones
const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Event listeners
pool.on('connect', () => {
    console.log('🔗 Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Error en PostgreSQL:', err.message);
});

// Probar la conexión al iniciar
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Base de datos conectada exitosamente');
        console.log(`📅 Timestamp del servidor: ${result.rows[0].now}`);
        client.release();
        return true;
    } catch (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
        return false;
    }
};

// Cerrar el pool al terminar la aplicación
const closePool = async () => {
    try {
        await pool.end();
        console.log('🔌 Conexión a PostgreSQL cerrada');
    } catch (err) {
        console.error('❌ Error cerrando la conexión:', err.message);
    }
};

// Capturar señales de terminación
process.on('SIGINT', async () => {
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closePool();
    process.exit(0);
});

export { pool, testConnection };