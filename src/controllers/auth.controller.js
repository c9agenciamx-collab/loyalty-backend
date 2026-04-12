import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { securityLogger } from '../lib/logger.js';

const BCRYPT_ROUNDS = 12;
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOpts() {
  return {
    httpOnly: true,
    secure:   env.isProd,
    sameSite: env.isProd ? 'strict' : 'lax',
    maxAge:   SESSION_MS,
  };
}

export async function register(req, res) {
  const { name, email, password, bizName } = req.body;

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'El email ya está registrado' });

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const slug = bizName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

  const admin = await prisma.admin.create({
    data: {
      name, email, passwordHash,
      business: {
        create: { name: bizName, slug, cardTitle: `Tarjeta ${bizName}` },
      },
    },
    include: { business: true },
  });

  const { token } = await createSession(admin.id);
  res.cookie('adminToken', token, cookieOpts());

  return res.status(201).json({
    admin:    { id: admin.id, name: admin.name, email: admin.email },
    business: { id: admin.business.id, name: admin.business.name, slug: admin.business.slug },
  });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const admin = await prisma.admin.findUnique({ where: { email } });
  const hashToCompare = admin?.passwordHash ?? '$2b$12$invalidhashfortimingsafety';
  const valid = await bcrypt.compare(password, hashToCompare);

  if (!admin || !valid) {
    securityLogger.authFailed(req.ip, email);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

 let token;
try {
  const session = await createSession(admin.id);
  token = session.token;
} catch (err) {
  return res.status(500).json({ error: 'Error creando sesión', detail: err.message });
}
res.cookie('adminToken', token, cookieOpts());
return res.json({ admin: { id: admin.id, name: admin.name, email: admin.email }, businessId: admin.businessId, token }); 
}

export async function logout(req, res) {
  const token = req.cookies?.adminToken;
  if (token) await prisma.adminSession.deleteMany({ where: { token } });
  res.clearCookie('adminToken');
  return res.json({ ok: true });
}

export async function me(req, res) {
  return res.json({
    admin: { id: req.admin.id, name: req.admin.name, email: req.admin.email },
    businessId: req.admin.businessId,
  });
}

async function createSession(adminId) {
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const token = jwt.sign({ sub: adminId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  await prisma.adminSession.create({ data: { adminId, token, expiresAt } });
  return { token };
}
