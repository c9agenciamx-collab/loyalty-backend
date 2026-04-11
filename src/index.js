import 'dotenv/config';
import { validateEnv, env } from './lib/env.js';

validateEnv();

import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import { helmetMiddleware, corsMiddleware } from './middleware/security.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';
import router from './routes/index.js';
import customerRouter from './routes/customer.routes.js';
import adminRouter from './routes/admin.routes.js';

const app = express();

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.set('trust proxy', 1);

app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(compression());

app.use('/api', generalLimiter);
app.use('/api', router);
app.use('/api/customer', customerRouter);
app.use('/api/admin', adminRouter);

app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use((req, res) => res.status(404).json({ error: 'Endpoint no encontrado' }));
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`✅ Servidor iniciado en puerto ${env.PORT}`);
});

process.on('SIGTERM', async () => {
  const { prisma } = await import('./lib/prisma.js');
  await prisma.$disconnect();
  process.exit(0);
});
