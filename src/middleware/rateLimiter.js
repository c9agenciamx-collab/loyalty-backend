import rateLimit from 'express-rate-limit';
import { securityLogger } from '../lib/logger.js';

function onLimitReached(req) {
  securityLogger.rateLimited(req.ip, req.path);
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res, next, options) {
    onLimitReached(req);
    const retryAfter = res.getHeader('Retry-After');
    const minutos = retryAfter ? Math.ceil(retryAfter / 60) : 15;
    res.status(429).json({
      error: `Demasiados intentos. Espera ${minutos} minuto${minutos !== 1 ? 's' : ''} antes de intentar de nuevo.`
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res, next, options) {
    onLimitReached(req);
    const retryAfter = res.getHeader('Retry-After');
    const minutos = retryAfter ? Math.ceil(retryAfter / 60) : 15;
    res.status(429).json({
      error: `Demasiados intentos de acceso. Espera ${minutos} minuto${minutos !== 1 ? 's' : ''} antes de intentar de nuevo.`
    });
  },
});

export const sensitiveLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res, next, options) {
    onLimitReached(req);
    const retryAfter = res.getHeader('Retry-After');
    const minutos = retryAfter ? Math.ceil(retryAfter / 60) : 15;
    res.status(429).json({
      error: `Límite alcanzado. Espera ${minutos} minuto${minutos !== 1 ? 's' : ''} antes de intentar de nuevo.`
    });
  },
});

export const stampLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res, next, options) {
    onLimitReached(req);
    const retryAfter = res.getHeader('Retry-After');
    const minutos = retryAfter ? Math.ceil(retryAfter / 60) : 15;
    res.status(429).json({
      error: `Demasiados sellos en poco tiempo. Espera ${minutos} minuto${minutos !== 1 ? 's' : ''}.`
    });
  },
});
