// El nombre de tabla y columnas es fijo; todos los datos externos usan parámetros.
module.exports = (db) => ({
  async list() { return (await db.query('SELECT * FROM posts ORDER BY id')).rows; },
  async get(id) { return (await db.query('SELECT * FROM posts WHERE id=$1', [id])).rows[0]; },
  async create(data) { return (await db.query('INSERT INTO posts (author_id, title, content, published) VALUES ($1, $2, $3, $4) RETURNING *', [data.author_id, data.title, data.content, data.published])).rows[0]; },
  async update(id, data) { return (await db.query('UPDATE posts SET author_id=$1, title=$2, content=$3, published=$4 WHERE id=$5 RETURNING *', [data.author_id, data.title, data.content, data.published, id])).rows[0]; },
  async remove(id) { return (await db.query('DELETE FROM posts WHERE id=$1 RETURNING id', [id])).rows[0]; },

    async byAuthor(id) {
      const author = await db.query('SELECT * FROM authors WHERE id=$1', [id]);
      if (!author.rows[0]) return null;
      const result = await db.query(`SELECT p.*, row_to_json(a) AS author FROM posts p
        JOIN authors a ON a.id=p.author_id WHERE p.author_id=$1 ORDER BY p.id`, [id]);
      return result.rows;
    },
});
