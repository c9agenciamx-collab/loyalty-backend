import { prisma } from '../lib/prisma.js';
import { v4 as uuid } from 'uuid';

// GET /api/admin/qr — devuelve el secret actual del negocio (rota si pasó el tiempo)
export async function getBusinessQR(req, res) {
  const businessId = req.businessId;
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  let bqr = await prisma.businessQR.findUnique({ where: { businessId } });

  if (!bqr) {
    bqr = await prisma.businessQR.create({ data: { businessId, secret: uuid() } });
  } else {
    const secs = (Date.now() - bqr.rotatedAt.getTime()) / 1000;
    if (secs >= (business.qrRotateSecs ?? 60)) {
      bqr = await prisma.businessQR.update({
        where: { businessId },
        data: { secret: uuid(), rotatedAt: new Date() }
      });
    }
  }

  const secsLeft = Math.max(0, (business.qrRotateSecs ?? 60) - Math.floor((Date.now() - bqr.rotatedAt.getTime()) / 1000));
  return res.json({ secret: bqr.secret, expiresIn: secsLeft });
}

// POST /api/customer/scan — cliente escanea el QR del negocio
export async function scanBusinessQR(req, res) {
  const { secret } = req.body;
  const customerId = req.customer.id;
  const businessId = req.customer.businessId;

  const bqr = await prisma.businessQR.findUnique({ where: { businessId } });
  if (!bqr || bqr.secret !== secret) {
    await prisma.fraudLog.create({
      data: { businessId, customerId, type: 'INVALID_QR', detail: 'QR inválido o ya usado', ip: req.ip ?? null }
    }).catch(() => {});
    return res.status(400).json({ error: 'QR inválido o expirado' });
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const secs = (Date.now() - bqr.rotatedAt.getTime()) / 1000;
  if (secs >= (business.qrRotateSecs ?? 60)) {
    return res.status(400).json({ error: 'QR expirado' });
  }

  // Límite diario
  const today = new Date(); today.setHours(0,0,0,0);
  const stampsToday = await prisma.stamp.count({
    where: { customerId, businessId, isRedeem: false, createdAt: { gte: today } }
  });
  if (stampsToday >= business.maxStampsPerDay) {
    await prisma.fraudLog.create({
      data: { businessId, customerId, type: 'DAILY_LIMIT_EXCEEDED', detail: `${stampsToday} sellos hoy`, ip: req.ip ?? null }
    }).catch(() => {});
    return res.status(400).json({ error: 'Límite de sellos del día alcanzado' });
  }

  // Rotar QR inmediatamente (un solo uso)
  await prisma.businessQR.update({
    where: { businessId },
    data: { secret: uuid(), rotatedAt: new Date() }
  });

  const [, updatedCustomer] = await prisma.$transaction([
    prisma.stamp.create({ data: { businessId, customerId, method: 'QR_SCAN' } }),
    prisma.customer.update({ where: { id: customerId }, data: { totalStamps: { increment: 1 } } }),
  ]);

  const milestones = await prisma.milestone.findMany({
    where: { businessId, active: true, atStamp: updatedCustomer.totalStamps }
  });

  return res.json({
    ok: true,
    totalStamps: updatedCustomer.totalStamps,
    milestonesReached: milestones.map(m => ({ prizeName: m.prizeName, atStamp: m.atStamp }))
  });
}