const { test } = require('node:test');
const assert = require('node:assert/strict');
for (const type of ['authors', 'posts', 'comments']) test(`${type}: los datos maliciosos se envían como parámetros`, async () => {
  const calls = [];
  const db = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: [{ id: 1 }] }; } };
  const service = require('../src/services/'+type)(db);
  const attack = "x'); DROP TABLE authors; --";
  const data = type === 'authors' ? { name: attack, email: 'a@example.com', bio: '' } : { title: attack, content: attack, author_id: 1, post_id: 1, published: false };
  await service.create(data);
  if (service.update) { await service.update(1, data); await service.get(1); await service.remove(1); }
  for (const call of calls) {
    assert.ok(!call.sql.includes(attack));
    assert.ok(call.sql.includes('$1'));
    assert.ok(Array.isArray(call.params));
  }
  assert.ok(calls[0].params.includes(attack));
});
