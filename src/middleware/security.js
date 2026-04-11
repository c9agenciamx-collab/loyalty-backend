import helmet from 'helmet';
import cors from 'cors';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  hsts: false,
});

export const corsMiddleware = cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
