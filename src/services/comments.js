module.exports = (db) => ({
  async list() { return (await db.query('SELECT * FROM comments ORDER BY id')).rows; },
  async create(data) {
    return (await db.query('INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING *',
      [data.post_id, data.author_id, data.content])).rows[0];
  },
  async byPost(id) {
    const post = await db.query('SELECT id FROM posts WHERE id=$1', [id]);
    if (!post.rows[0]) return null;
    return (await db.query('SELECT * FROM comments WHERE post_id=$1 ORDER BY id', [id])).rows;
  }
});
