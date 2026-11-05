function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.code === '23505') { status = 400; message = 'El email ya está registrado'; }
  if (error.code === '23503') { status = 400; message = 'El author o post indicado no existe'; }
  if (['23502', '23514', '22P02', '22003'].includes(error.code)) { status = 400; message = 'Datos inválidos'; }
  if (error.type === 'entity.parse.failed') { status = 400; message = 'JSON inválido'; }
  if (status >= 500) { message = 'Error interno del servidor'; console.error('Error interno:', error.code || error.name); }
  res.status(status).json({ error: message });
}
module.exports = { errorHandler };
