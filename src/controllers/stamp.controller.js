import { prisma } from '../lib/prisma.js';
import { securityLogger } from '../lib/logger.js';

function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export async function giveStamp(req, res) {
  const { cardCode, lat, lng, method } = req.body;
  const businessId = req.businessId;

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

  const customer = await prisma.customer.findFirst({ where: { cardCode, businessId } });
  if (!customer) return res.status(404).json({ error: 'Tarjeta no encontrada' });

  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  const stampsToday = await prisma.stamp.count({ where: { customerId: customer.id, businessId, isRedeem: false, createdAt: { gte: startOfDay } } });

  if (stampsToday >= business.maxStampsPerDay) {
    securityLogger.fraudDetected(businessId, 'DAILY_LIMIT_EXCEEDED', `Cliente ${customer.id}`);
    await prisma.fraudLog.create({ data: { businessId, customerId: customer.id, type: 'DAILY_LIMIT_EXCEEDED', detail: `${stampsToday} sellos hoy`, ip: req.ip } });
    return res.status(429).json({ error: 'Límite diario alcanzado', message: `Máximo ${business.maxStampsPerDay} sellos por día` });
  }

  if (business.geoVerify && business.geoLat && business.geoLng && lat && lng) {
    const dist = distanceMeters(lat, lng, business.geoLat, business.geoLng);
    if (dist > business.geoRadiusMeters) {
      securityLogger.fraudDetected(businessId, 'GEO_MISMATCH', `${Math.round(dist)}m`);
      await prisma.fraudLog.create({ data: { businessId, customerId: customer.id, type: 'GEO_MISMATCH', detail: `Distancia: ${Math.round(dist)}m`, ip: req.ip } });
      return res.status(403).json({ error: 'Fuera del rango del local', distanceMeters: Math.round(dist) });
    }
  }

  const [stamp, updatedCustomer] = await prisma.$transaction([
    prisma.stamp.create({ data: { businessId, customerId: customer.id, adminId: req.admin.id, method, lat: lat ?? null, lng: lng ?? null } }),
    prisma.customer.update({ where: { id: customer.id }, data: { totalStamps: { increment: 1 } } }),
  ]);

  securityLogger.stampGiven(businessId, customer.id, req.admin.id);

  const milestones = await prisma.milestone.findMany({ where: { businessId, active: true, atStamp: updatedCustomer.totalStamps } });

  return res.status(201).json({
    ok: true,
    stamp: { id: stamp.id, createdAt: stamp.createdAt },
    customer: { id: updatedCustomer.id, name: updatedCustomer.name, cardCode: updatedCustomer.cardCode, totalStamps: updatedCustomer.totalStamps },
    milestonesReached: milestones.map(m => ({ id: m.id, prizeName: m.prizeName, atStamp: m.atStamp })),
  });
}

export async function redeemReward(req, res) {
  const { cardCode, milestoneId } = req.body;
  const businessId = req.businessId;

  const [customer, milestone] = await Promise.all([
    prisma.customer.findFirst({ where: { cardCode, businessId } }),
    prisma.milestone.findFirst({ where: { id: milestoneId, businessId, active: true } }),
  ]);

  if (!customer) return res.status(404).json({ error: 'Tarjeta no encontrada' });
  if (!milestone) return res.status(404).json({ error: 'Premio no encontrado' });
  if (customer.totalStamps < milestone.atStamp) return res.status(400).json({ error: 'Sellos insuficientes', required: milestone.atStamp, current: customer.totalStamps });

  await prisma.stamp.create({ data: { businessId, customerId: customer.id, adminId: req.admin.id, method: 'MANUAL', isRedeem: true, rewardLabel: milestone.prizeName } });
  securityLogger.rewardRedeemed(businessId, customer.id, milestone.prizeName);

  return res.json({ ok: true, redeemed: { prizeName: milestone.prizeName }, customer: { name: customer.name, totalStamps: customer.totalStamps } });
}

export async function stampHistory(req, res) {
  const page  = Math.max(1, parseInt(req.query.page ?? '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit ?? '20', 10));
  const [stamps, total] = await prisma.$transaction([
    prisma.stamp.findMany({ where: { businessId: req.businessId }, include: { customer: { select: { name: true, cardCode: true } } }, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit }),
    prisma.stamp.count({ where: { businessId: req.businessId } }),
  ]);
  return res.json({ stamps, total, page, pages: Math.ceil(total/limit) });
}
