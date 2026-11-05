const { Router } = require('express');
const { idParam, bodyFor } = require('../middlewares/validation');
function found(res, data) {
  return data == null ? res.status(404).json({ error: 'Recurso no encontrado' }) : res.json(data);
}
function routes(services) {
  const router = Router();
  for (const type of ['authors', 'posts']) {
    const service = services[type];
    router.get(`/${type}`, async (req, res) => res.json(await service.list()));
    router.get(`/${type}/:id`, idParam(), async (req, res) => found(res, await service.get(req.params.id)));
    router.post(`/${type}`, bodyFor(type), async (req, res) => {
      const result = await service.create(req.body);
      res.location(`/${type}/${result.id}`).status(201).json(result);
    });
    router.put(`/${type}/:id`, idParam(), bodyFor(type), async (req, res) => found(res, await service.update(req.params.id, req.body)));
    router.delete(`/${type}/:id`, idParam(), async (req, res) => {
      const result = await service.remove(req.params.id);
      if (!result) return res.status(404).json({ error: 'Recurso no encontrado' });
      res.status(204).end();
    });
  }
  router.get('/posts/author/:authorId', idParam('authorId'), async (req, res) => found(res, await services.posts.byAuthor(req.params.authorId)));
  router.get('/comments', async (req, res) => res.json(await services.comments.list()));
  router.post('/comments', bodyFor('comments'), async (req, res) => res.status(201).json(await services.comments.create(req.body)));
  router.get('/posts/:id/comments', idParam(), async (req, res) => found(res, await services.comments.byPost(req.params.id)));
  return router;
}
module.exports = { routes };
