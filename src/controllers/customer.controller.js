import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { securityLogger } from '../lib/logger.js';

const SESSION_MS = 90 * 24 * 60 * 60 * 1000;

function generateCardCode() {
  const year = new Date().getFullYear();
  const num  = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `LC-${year}-${num}`;
}

function cookieOpts() {
  return { httpOnly: true, secure: env.isProd, sameSite: env.isProd ? 'strict' : 'lax', maxAge: SESSION_MS };
}

export async function registerCustomer(req, res) {
  const { businessSlug } = req.params;
  const { name, email, phone, pushToken, walletType } = req.body;

  const business = await prisma.business.findUnique({ where: { slug: businessSlug } });
  if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

  if (email) {
    const existing = await prisma.customer.findUnique({ where: { businessId_email: { businessId: business.id, email } } });
    if (existing) {
      securityLogger.fraudDetected(business.id, 'DUPLICATE_ACCOUNT', `Email duplicado: ${email}`);
      return res.status(409).json({ error: 'Este email ya tiene una tarjeta registrada' });
    }
  }

  let cardCode = generateCardCode();
  let attempts = 0;
  while (await prisma.customer.findUnique({ where: { cardCode } })) {
    cardCode = generateCardCode();
    if (++attempts > 10) throw new Error('No se pudo generar cardCode único');
  }

  const customer = await prisma.customer.create({
    data: { businessId: business.id, name, email: email ?? null, phone: phone ?? null, pushToken: pushToken ?? null, walletType: walletType ?? null, cardCode },
  });

  const { token, qrSecret } = await createCustomerSession(customer.id);
  res.cookie('customerToken', token, cookieOpts());

  return res.status(201).json({
    customer: { id: customer.id, name: customer.name, cardCode: customer.cardCode, totalStamps: 0 },
    qrSecret,
    business: { id: business.id, name: business.name, cardTitle: business.cardTitle, totalStamps: business.totalStamps },
  });
}

export async function loginCustomer(req, res) {
  const { businessSlug } = req.params;
  const { cardCode } = req.body;

  const business = await prisma.business.findUnique({ where: { slug: businessSlug } });
  if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

  const customer = await prisma.customer.findFirst({ where: { cardCode, businessId: business.id } });
  if (!customer) {
    securityLogger.authFailed(req.ip, `cardCode:${cardCode}`);
    return res.status(401).json({ error: 'Tarjeta no encontrada' });
  }

  const { token, qrSecret } = await createCustomerSession(customer.id);
  res.cookie('customerToken', token, cookieOpts());
  return res.json({ customer: { id: customer.id, name: customer.name, cardCode: customer.cardCode, totalStamps: customer.totalStamps }, qrSecret });
}

export async function getCard(req, res) {
  const customer = req.customer;
  const session  = req.session;

  const [business, milestones, recentStamps] = await Promise.all([
    prisma.business.findUnique({ where: { id: customer.businessId }, include: { milestones: { where: { active: true }, orderBy: { atStamp: 'asc' } } } }),
    prisma.milestone.findMany({ where: { businessId: customer.businessId, active: true }, orderBy: { atStamp: 'asc' } }),
    prisma.stamp.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  let qrSecret = session.qrSecret;
  const secondsSince = (Date.now() - session.qrRotatedAt.getTime()) / 1000;
  if (secondsSince >= (business?.qrRotateSecs ?? 60)) {
    qrSecret = uuid();
    await prisma.customerSession.update({ where: { id: session.id }, data: { qrSecret, qrRotatedAt: new Date() } });
  }

  const rewards = milestones.map(m => ({
    id: m.id, prizeName: m.prizeName, atStamp: m.atStamp,
    available: customer.totalStamps >= m.atStamp,
    progress:  Math.min(100, Math.round((customer.totalStamps / m.atStamp) * 100)),
    remaining: Math.max(0, m.atStamp - customer.totalStamps),
  }));

  return res.json({ customer: { id: customer.id, name: customer.name, cardCode: customer.cardCode, totalStamps: customer.totalStamps }, qrSecret, token });
}

export async function updateWallet(req, res) {
  const { walletType } = req.body;
  await prisma.customer.update({ where: { id: req.customer.id }, data: { walletType } });
  return res.json({ ok: true, walletType });
}

async function createCustomerSession(customerId) {
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const token = jwt.sign({ sub: customerId, type: 'customer' }, env.JWT_SECRET, { expiresIn: '90d' });
  const qrSecret = uuid();
  await prisma.customerSession.create({ data: { customerId, token, qrSecret, expiresAt } });
  return { token, qrSecret };
}
