import 'dotenv/config';

const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'PORT',
  'NODE_ENV',
  'ALLOWED_ORIGINS',
];

export function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error('\n❌ ERROR: Faltan variables de entorno:');
    missing.forEach((k) => console.error(`   • ${k}`));
    process.exit(1);
  }
}

export const env = {
  DATABASE_URL:    process.env.DATABASE_URL,
  JWT_SECRET:      process.env.JWT_SECRET,
  JWT_EXPIRES_IN:  process.env.JWT_EXPIRES_IN ?? '7d',
  PORT:            parseInt(process.env.PORT ?? '3000', 10),
  NODE_ENV:        process.env.NODE_ENV ?? 'development',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()),
  isProd:          process.env.NODE_ENV === 'production',
  PUSH_PROVIDER:   process.env.PUSH_PROVIDER,
  ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID,
  ONESIGNAL_API_KEY: process.env.ONESIGNAL_API_KEY,
};
