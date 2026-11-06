require('dotenv').config();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../src/app');

test('SQL + HTTP: CRUD, restricciones, joins, seed y cascadas', async (t) => {
  let db, close, exec;
  if (process.env.TEST_EMBEDDED === '1') {
    const { PGlite } = require('@electric-sql/pglite');
    db = new PGlite(); exec = (sql) => db.exec(sql); close = () => db.close();
  } else {
    if (!process.env.TEST_DATABASE_URL) throw new Error('Configurar TEST_DATABASE_URL con una base dedicada a tests');
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 5000 });
    const client = await pool.connect();
    const schema = 'miniblog_test_' + Date.now();
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}`);
    db = client; exec = (sql) => client.query(sql);
    close = async () => { await client.query('ROLLBACK'); await client.query(`DROP SCHEMA ${schema} CASCADE`); client.release(); await pool.end(); };
  }
  t.after(close);
  const setup = await fs.readFile(path.join(__dirname, '../sql/setup.sql'), 'utf8');
  const seed = await fs.readFile(path.join(__dirname, '../sql/seed.sql'), 'utf8');
  await exec(setup); await exec(setup); // El setup es repetible sin borrar datos.
  await exec(seed); await exec(seed);
  assert.equal((await db.query('SELECT * FROM authors')).rows.length, 2);
  assert.equal((await db.query('SELECT * FROM posts')).rows.length, 1);
  assert.equal((await db.query('SELECT * FROM comments')).rows.length, 1);
  const api = request(createApp({ db }));
  await api.get('/health').expect(200);
  const a = (await api.post('/authors').send({ name: 'Test', email: 'test@example.com' }).expect(201)).body;
  await api.post('/authors').send({ name: 'Duplicado', email: 'TEST@example.com' }).expect(400);
  await api.get('/authors').expect(200).then(r => assert.equal(r.body.length, 3));
  await api.get('/authors/'+a.id).expect(200).then(r => assert.equal(r.body.name, 'Test'));
  await api.put('/authors/'+a.id).send({ name: 'Nuevo', email: 'test@example.com', bio: 'Bio' }).expect(200);
  await api.put('/authors/'+a.id).send({ name: 'Nuevo', email: 'ana@example.com' }).expect(400);
  await api.get('/posts/author/'+a.id).expect(200, []);
  const payload = { author_id: a.id, title: "SQL ' y parámetros", content: 'Texto', published: true };
  const post = (await api.post('/posts').send(payload).expect(201)).body;
  await api.get('/posts').expect(200).then(r => assert.equal(r.body.length, 2));
  await api.get('/posts/'+post.id).expect(200).then(r => assert.equal(r.body.published, true));
  await api.get('/posts/author/'+a.id).expect(200).then(r => { assert.equal(r.body[0].author.name, 'Nuevo'); assert.equal(r.body[0].id, post.id); });
  await api.put('/posts/'+post.id).send({ ...payload, title: 'Editado', published: false }).expect(200).then(r => assert.equal(r.body.title, 'Editado'));
  await api.post('/posts').send({ ...payload, author_id: 2147483647 }).expect(400);
  await api.put('/posts/'+post.id).send({ ...payload, author_id: 2147483647 }).expect(400);
  const c = (await api.post('/comments').send({ post_id: post.id, author_id: a.id, content: '¡Hola!' }).expect(201)).body;
  await api.get('/comments').expect(200).then(r => assert.equal(r.body.length, 2));
  await api.get('/posts/'+post.id+'/comments').expect(200).then(r => assert.equal(r.body[0].id, c.id));
  await api.post('/comments').send({ post_id: 2147483647, author_id: a.id, content: 'Error' }).expect(400);
  await api.post('/comments').send({ post_id: post.id, author_id: 2147483647, content: 'Error' }).expect(400);
  await api.delete('/posts/'+post.id).expect(204);
  assert.equal((await db.query('SELECT * FROM comments WHERE id=$1', [c.id])).rows.length, 0);
  await api.get('/posts/'+post.id).expect(404);
  await api.delete('/posts/'+post.id).expect(404);
  const ownPost = (await api.post('/posts').send(payload).expect(201)).body;
  // Comentario de otro autor en un post que será borrado.
  const other = (await api.post('/authors').send({ name: 'Otro', email: 'other@example.com' }).expect(201)).body;
  await api.post('/comments').send({ post_id: ownPost.id, author_id: other.id, content: 'Cascada por post' }).expect(201);
  const otherPost = (await api.post('/posts').send({ ...payload, author_id: other.id }).expect(201)).body;
  const crossComment = (await api.post('/comments').send({ post_id: otherPost.id, author_id: a.id, content: 'Cascada por autor' }).expect(201)).body;
  await api.delete('/authors/'+a.id).expect(204);
  await api.get('/authors/'+a.id).expect(404);
  await api.get('/posts/'+ownPost.id).expect(404);
  await api.get('/posts/'+otherPost.id).expect(200);
  assert.equal((await db.query('SELECT * FROM comments WHERE id=$1', [crossComment.id])).rows.length, 0);
  await api.get('/posts/'+ownPost.id+'/comments').expect(404);
  await api.get('/posts/author/'+a.id).expect(404);
  await api.put('/authors/'+a.id).send({ name: 'No', email: 'no@example.com' }).expect(404);
  await api.put('/posts/'+post.id).send({ ...payload, author_id: other.id }).expect(404);
  await api.delete('/authors/'+a.id).expect(404);
  await assert.rejects(db.query("INSERT INTO authors(name,email) VALUES (' ', 'blank@example.com')"), e => e.code === '23514');
  await assert.rejects(db.query("INSERT INTO authors(name,email) VALUES ('Ana', 'ANA@EXAMPLE.COM')"), e => e.code === '23505');
});
