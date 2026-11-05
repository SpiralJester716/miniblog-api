// El nombre de tabla y columnas es fijo; todos los datos externos usan parámetros.
module.exports = (db) => ({
  async list() { return (await db.query('SELECT * FROM authors ORDER BY id')).rows; },
  async get(id) { return (await db.query('SELECT * FROM authors WHERE id=$1', [id])).rows[0]; },
  async create(data) { return (await db.query('INSERT INTO authors (name, email, bio) VALUES ($1, $2, $3) RETURNING *', [data.name, data.email, data.bio])).rows[0]; },
  async update(id, data) { return (await db.query('UPDATE authors SET name=$1, email=$2, bio=$3 WHERE id=$4 RETURNING *', [data.name, data.email, data.bio, id])).rows[0]; },
  async remove(id) { return (await db.query('DELETE FROM authors WHERE id=$1 RETURNING id', [id])).rows[0]; },
});
