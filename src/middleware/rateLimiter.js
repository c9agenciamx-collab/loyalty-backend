import rateLimit from 'express-rate-limit';
import { securityLogger } from '../lib/logger.js';

function onLimitReached(req) {
  securityLogger.rateLimited(req.ip, req.path);
}

const limitMessage = (windowMin, max) => ({
  status: 429,
  error: 'Too Many Requests',
  message: `Límite: ${max} por ${windowMin} minutos. Intenta más tarde.`,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage(15, 100),
  handler(req, res, next, options) {
    onLimitReached(req);
    res.status(options.statusCode).json(options.message);
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage(15, 5),
  handler(req, res, next, options) {
    onLimitReached(req);
    res.status(options.statusCode).json(options.message);
  },
});

export const sensitiveLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage(15, 10),
  handler(req, res, next, options) {
    onLimitReached(req);
    res.status(options.statusCode).json(options.message);
  },
});

export const stampLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage(15, 50),
  handler(req, res, next, options) {
    onLimitReached(req);
    res.status(options.statusCode).json(options.message);
  },
});
