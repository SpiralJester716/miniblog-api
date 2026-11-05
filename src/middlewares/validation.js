const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
function validId(value) { return Number.isInteger(value) && value > 0 && value <= 2147483647; }
function idParam(name = 'id') {
  return (req, res, next) => {
    if (!/^[1-9]\d*$/.test(req.params[name]) || !validId(Number(req.params[name])))
      return next(badRequest(`${name} debe ser un entero positivo`));
    req.params[name] = Number(req.params[name]); next();
  };
}
function bodyFor(type) {
  return (req, res, next) => {
    try {
      const b = req.body;
      if (!b || typeof b !== 'object' || Array.isArray(b)) throw badRequest('Se requiere un objeto JSON');
      const required = type === 'authors' ? ['name', 'email'] : type === 'posts' ? ['title', 'content'] : ['content'];
      const allowed = type === 'authors' ? ['name', 'email', 'bio'] : type === 'posts' ? ['author_id', 'title', 'content', 'published'] : ['author_id', 'post_id', 'content'];
      if (Object.keys(b).some(k => !allowed.includes(k))) throw badRequest('El cuerpo contiene campos desconocidos');
      for (const key of required) {
        if (typeof b[key] !== 'string' || !b[key].trim()) throw badRequest(`${key} no puede estar vacío`);
        b[key] = b[key].trim();
      }
      if (type === 'authors') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) throw badRequest('email inválido');
        b.email = b.email.toLowerCase();
        if (b.bio !== undefined && typeof b.bio !== 'string') throw badRequest('bio debe ser texto');
        b.bio = (b.bio ?? '').trim();
      } else {
        if (!validId(b.author_id)) throw badRequest('author_id debe ser un entero positivo');
        if (type === 'comments' && !validId(b.post_id)) throw badRequest('post_id debe ser un entero positivo');
        if (type === 'posts') {
          if (b.published !== undefined && typeof b.published !== 'boolean') throw badRequest('published debe ser booleano');
          b.published = b.published ?? false;
        }
      }
      next();
    } catch (error) { next(error); }
  };
}
module.exports = { idParam, bodyFor };
