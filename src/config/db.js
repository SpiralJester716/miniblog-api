require('dotenv').config();
const { Pool } = require('pg');
function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('Falta DATABASE_URL');
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000, max: 10 });
  pool.on('error', (error) => console.error('Error de conexión PostgreSQL:', error.code));
  return pool;
}
module.exports = { createPool };
