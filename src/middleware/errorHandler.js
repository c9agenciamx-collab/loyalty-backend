import { logger } from '../lib/logger.js';
import { env } from '../lib/env.js';

export function errorHandler(err, req, res, next) {
  logger.error('REQUEST_ERROR', {
    message: err.message,
    path:    req.path,
    method:  req.method,
    ip:      req.ip,
    code:    err.code,
    ...(env.isProd ? {} : { stack: err.stack }),
  });

  if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
  if (err.code === 'P2003') return res.status(400).json({ error: 'Referencia inválida' });
  if (err.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', issues: err.issues });
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Token inválido' });
  if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Sesión expirada' });
  if (err.message?.startsWith('CORS:')) return res.status(403).json({ error: 'Origen no permitido' });

  const status  = err.status ?? err.statusCode ?? 500;
  const message = env.isProd ? 'Error interno del servidor' : err.message;
  return res.status(status).json({ error: message });
}
