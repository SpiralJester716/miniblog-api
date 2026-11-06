const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
function fixture(overrides = {}) {
  const calls = [];
  const services = {};
  for (const type of ['authors', 'posts', 'comments']) services[type] = {
    list: async () => [], get: async () => ({ id: 1 }),
    create: async (data) => { calls.push(data); return { id: 1, ...data }; },
    update: async (id, data) => ({ id, ...data }), remove: async () => ({ id: 1 }),
    byAuthor: async () => [], byPost: async () => [], ...overrides[type]
  };
  return { app: createApp({ services, db: { query: async () => ({ rows: [] }) } }), calls };
}
const author = { name: 'Ana', email: 'ana@example.com' };
const post = { author_id: 1, title: 'Título', content: 'Texto' };
for (const [path, body] of [['authors', author], ['posts', post], ['comments', { post_id: 1, author_id: 1, content: 'Comentario' }]]) {
  test(`GET /${path} devuelve lista vacía`, async () => { await request(fixture().app).get('/'+path).expect(200, []); });
  test(`POST /${path} crea y devuelve 201`, async () => { const r = await request(fixture().app).post('/'+path).send(body).expect(201); assert.equal(r.body.id, 1); });
  test(`POST /${path} rechaza campos vacíos`, async () => { await request(fixture().app).post('/'+path).send({}).expect(400); });
}
for (const [path, body] of [['authors', author], ['posts', post]]) {
  test(`CRUD /${path}/:id y Location`, async () => {
    const { app } = fixture();
    await request(app).get(`/${path}/1`).expect(200);
    await request(app).put(`/${path}/1`).send(body).expect(200);
    const deleted = await request(app).delete(`/${path}/1`).expect(204); assert.equal(deleted.text, '');
    const created = await request(app).post('/'+path).send(body).expect(201); assert.equal(created.headers.location, `/${path}/1`);
  });
  test(`/${path} devuelve 404 para recurso ausente`, async () => {
    const { app } = fixture({ [path]: { get: async () => null, update: async () => null, remove: async () => null } });
    await request(app).get(`/${path}/99`).expect(404);
    await request(app).put(`/${path}/99`).send(body).expect(404);
    await request(app).delete(`/${path}/99`).expect(404);
  });
  for (const id of ['0', '-1', 'abc', '1.2', '2147483648', '1 OR 1=1']) test(`/${path}/${id} rechaza ID inválido`, async () => {
    await request(fixture().app).get(`/${path}/${encodeURIComponent(id)}`).expect(400);
  });
}
for (const body of [{ name: ' ', email: author.email }, { ...author, email: 'sin-arroba' }, { ...author, bio: 1 }, { ...author, id: 22 }, [], null]) test(`author inválido: ${JSON.stringify(body)}`, async () => {
  await request(fixture().app).post('/authors').send(body).expect(400);
});
for (const body of [{ ...post, title: ' ' }, { ...post, content: '' }, { ...post, author_id: '1' }, { ...post, author_id: -1 }, { ...post, published: 'false' }]) test(`post inválido: ${JSON.stringify(body)}`, async () => {
  await request(fixture().app).post('/posts').send(body).expect(400);
});
test('normaliza email, nombre y defaults', async () => {
  const { app, calls } = fixture();
  await request(app).post('/authors').send({ name: ' Ana ', email: ' ANA@EXAMPLE.COM ' }).expect(201);
  assert.deepEqual(calls[0], { name: 'Ana', email: 'ana@example.com', bio: '' });
});
for (const code of ['23505', '23503', '23514']) test(`error PostgreSQL ${code} devuelve 400`, async () => {
  const { app } = fixture({ authors: { create: async () => { throw Object.assign(new Error('SQL privado'), { code }); } } });
  await request(app).post('/authors').send(author).expect(400);
});
test('error inesperado no filtra detalles', async () => {
  const { app } = fixture({ posts: { list: async () => { throw new Error('password=secreto'); } } });
  await request(app).get('/posts').expect(500, { error: 'Error interno del servidor' });
});
test('JSON malformado, cuerpo ausente y ruta inexistente', async () => {
  const { app } = fixture();
  await request(app).post('/authors').set('Content-Type', 'application/json').send('{').expect(400);
  await request(app).post('/authors').expect(400);
  await request(app).get('/no-existe').expect(404);
});
test('rutas relacionadas: lista vacía, inexistente e ID inválido', async () => {
  const { app } = fixture();
  await request(app).get('/posts/author/1').expect(200, []);
  await request(app).get('/posts/1/comments').expect(200, []);
  await request(app).get('/posts/author/abc').expect(400);
  await request(app).get('/posts/0/comments').expect(400);
  const missing = fixture({ posts: { byAuthor: async () => null }, comments: { byPost: async () => null } }).app;
  await request(missing).get('/posts/author/1').expect(404);
  await request(missing).get('/posts/1/comments').expect(404);
});
test('health consulta base y docs están disponibles', async () => {
  const { app } = fixture();
  await request(app).get('/health').expect(200, { status: 'ok' });
  await request(app).get('/docs/').expect(200);
  const r = await request(app).get('/openapi.json').expect(200); assert.equal(r.body.openapi, '3.0.3');
  await require('@apidevtools/swagger-parser').validate(require('../openapi.json'));
});
test('health devuelve 500 si PostgreSQL falla', async () => {
  const app = createApp({ db: { query: async () => { throw new Error('offline'); } } });
  await request(app).get('/health').expect(500);
});
