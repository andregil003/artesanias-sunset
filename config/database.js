// config/database.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// ========================================
// VALIDAR VARIABLES DE ENTORNO
// ========================================
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
    console.error('📋 Requiere: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
    process.exit(1);
}

// ========================================
// CREAR POOL DE CONEXIONES
// ========================================
export const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// ========================================
// EVENT LISTENERS
// ========================================
pool.on('connect', () => {
    console.log('🔗 Cliente conectado al pool de PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Error no esperado en el pool de PostgreSQL:', err.message);
});

// ========================================
// PROBAR CONEXIÓN
// ========================================
export const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Conexión a la base de datos exitosa');
        console.log(`📅 Timestamp del servidor: ${result.rows[0].now}`);
        client.release();
        return true;
    } catch (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
        console.error('🔍 Verifica:', {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            'password': '***'
        });
        return false;
    }
};

// ========================================
// CERRAR POOL
// ========================================
const closePool = async () => {
    try {
        await pool.end();
        console.log('🔌 Conexión a PostgreSQL cerrada');
    } catch (err) {
        console.error('❌ Error cerrando la conexión:', err.message);
    }
};

// ========================================
// CAPTURAR SEÑALES DE TERMINACIÓN
// ========================================
process.on('SIGINT', async () => {
    console.log('\n🛑 Recibida señal SIGINT');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Recibida señal SIGTERM');
    await closePool();
    process.exit(0);
});

export default { pool, testConnection };