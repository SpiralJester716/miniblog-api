const { createPool } = require('./config/db');
const { createApp } = require('./app');
const pool = createPool();
const port = Number(process.env.PORT || 3000);
async function start() {
  await pool.query('SELECT 1');
  const server = createApp({ db: pool }).listen(port, '0.0.0.0', () => console.log(`MiniBlog escuchando en puerto ${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    server.close(async () => { await pool.end(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
start().catch(async (error) => { console.error('No se pudo iniciar:', error.code || error.message); await pool.end(); process.exitCode = 1; });
