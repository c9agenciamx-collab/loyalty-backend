import helmet from 'helmet';
import cors from 'cors';
import { env } from '../lib/env.js';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
    },
  },
  hsts: env.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
});

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin && !env.isProd) return callback(null, true);
    if (env.ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origen no permitido — ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export function allowIframe(req, res, next) {
  res.setHeader('X-Frame-Options', 'ALLOW-FROM https://c9agencia.wixsite.com');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://c9agencia.wixsite.com https://*.wix.com");
  next();
}
