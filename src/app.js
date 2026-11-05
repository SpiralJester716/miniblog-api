const express = require('express');
const swaggerUi = require('swagger-ui-express');
const spec = require('../openapi.json');
const { routes } = require('./routes');
const { errorHandler } = require('./middlewares/errors');
function createApp({ db, services } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.get('/', (req, res) => res.json({ name: 'MiniBlog API', docs: '/docs', health: '/health' }));
  app.get('/health', async (req, res) => { await db.query('SELECT 1'); res.json({ status: 'ok' }); });
  app.get('/openapi.json', (req, res) => res.json(spec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.use(routes(services || {
    authors: require('./services/authors')(db), posts: require('./services/posts')(db), comments: require('./services/comments')(db)
  }));
  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
