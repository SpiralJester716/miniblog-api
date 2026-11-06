const fs = require('node:fs/promises');
const path = require('node:path');
const { createPool } = require('../src/config/db');
async function main() {
  const action = process.argv[2];
  if (!['setup', 'seed'].includes(action)) throw new Error('Usar setup o seed');
  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query(await fs.readFile(path.join(__dirname, '..', 'sql', `${action}.sql`), 'utf8'));
    console.log(`${action}: completado`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); await pool.end(); }
}
main().catch((error) => { console.error('Falló la operación:', error.message); process.exitCode = 1; });
