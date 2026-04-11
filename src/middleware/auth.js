import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';
import { securityLogger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

export async function requireAdmin(req, res, next) {
  try {
    const token =
      req.cookies?.adminToken ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) return res.status(401).json({ error: 'No autenticado' });

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      securityLogger.authFailed(req.ip, 'invalid_token');
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const session = await prisma.adminSession.findUnique({
      where: { token },
      include: { admin: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Sesión expirada' });
    }

    req.admin = session.admin;
    req.businessId = session.admin.businessId;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireCustomer(req, res, next) {
  try {
    const token =
      req.cookies?.customerToken ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) return res.status(401).json({ error: 'No autenticado' });

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const session = await prisma.customerSession.findUnique({
      where: { token },
      include: { customer: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Sesión expirada' });
    }

    req.customer = session.customer;
    req.session  = session;
    next();
  } catch (err) {
    next(err);
  }
}
