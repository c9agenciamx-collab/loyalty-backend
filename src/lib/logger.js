import winston from 'winston';
import { env } from './env.js';

const SENSITIVE_FIELDS = ['password', 'passwordHash', 'token', 'secret', 'jwt'];

function redactSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const redacted = { ...obj };
  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }
  return redacted;
}

const { combine, timestamp, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: env.isProd ? 'info' : 'debug',
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (!env.isProd) {
  logger.add(new winston.transports.Console({
    format: combine(colorize(), simple()),
  }));
}

export const securityLogger = {
  authFailed:    (ip, email)  => logger.warn('AUTH_FAILED',    { ip, email }),
  rateLimited:   (ip, path)   => logger.warn('RATE_LIMITED',   { ip, path }),
  inputRejected: (ip, path, reason) => logger.warn('INPUT_REJECTED', { ip, path, reason }),
  fraudDetected: (businessId, type, detail) => logger.warn('FRAUD', { businessId, type, detail }),
  stampGiven:    (businessId, customerId, adminId) => logger.info('STAMP_GIVEN', { businessId, customerId, adminId }),
  rewardRedeemed:(businessId, customerId, prize)   => logger.info('REWARD_REDEEMED', { businessId, customerId, prize }),
};
