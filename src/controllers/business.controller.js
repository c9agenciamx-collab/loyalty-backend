import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export async function getBusiness(req, res) {
  const biz = await prisma.business.findUnique({
    where: { id: req.businessId },
    include: { milestones: { where: { active: true }, orderBy: { atStamp: 'asc' } } },
  });
  if (!biz) return res.status(404).json({ error: 'Negocio no encontrado' });
  return res.json(biz);
}

export async function updateLogo(req, res) {
  const { logoUrl } = req.body;
  const biz = await prisma.business.update({ where: { id: req.businessId }, data: { logoUrl: logoUrl ?? null }, select: { id: true, logoUrl: true } });
  logger.info('LOGO_UPDATED', { businessId: req.businessId, removed: !logoUrl });
  return res.json({ ok: true, logoUrl: biz.logoUrl });
}

export async function updateStampIcon(req, res) {
  const { stampIconUrl } = req.body;
  const biz = await prisma.business.update({ where: { id: req.businessId }, data: { stampIconUrl: stampIconUrl ?? null }, select: { id: true, stampIconUrl: true } });
  logger.info('STAMP_ICON_UPDATED', { businessId: req.businessId, removed: !stampIconUrl });
  return res.json({ ok: true, stampIconUrl: biz.stampIconUrl });
}

export async function dashboardStats(req, res) {
  const businessId = req.businessId;
  const today    = new Date(); today.setHours(0,0,0,0);
  const yesterday= new Date(today); yesterday.setDate(yesterday.getDate()-1);
  const weekAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalCustomers, newCustomersMonth, stampsToday, stampsYesterday, rewardsTotal, fraudOpen, dist_1_4, dist_5_8, dist_9plus, emailCount] =
    await prisma.$transaction([
      prisma.customer.count({ where: { businessId } }),
      prisma.customer.count({ where: { businessId, createdAt: { gte: monthAgo } } }),
      prisma.stamp.count({   where: { businessId, isRedeem: false, createdAt: { gte: today } } }),
      prisma.stamp.count({   where: { businessId, isRedeem: false, createdAt: { gte: yesterday, lt: today } } }),
      prisma.stamp.count({   where: { businessId, isRedeem: true } }),
      prisma.fraudLog.count({where: { businessId, resolved: false } }),
      prisma.customer.count({ where: { businessId, totalStamps: { gte: 1,  lt: 5  } } }),
      prisma.customer.count({ where: { businessId, totalStamps: { gte: 5,  lt: 9  } } }),
      prisma.customer.count({ where: { businessId, totalStamps: { gte: 9  } } }),
      prisma.customer.count({ where: { businessId, email: { not: null } } }),
    ]);

  return res.json({
    metrics: { totalCustomers, newCustomersMonth, stampsToday, stampsYesterday, rewardsTotal, fraudOpen, emailCount },
    distribution: { range_1_4: dist_1_4, range_5_8: dist_5_8, range_9plus: dist_9plus },
  });
}

export async function activeRewards(req, res) {
  const businessId = req.businessId;
  const milestones = await prisma.milestone.findMany({ where: { businessId, active: true }, orderBy: { atStamp: 'asc' } });
  const enriched = await Promise.all(milestones.map(async (m) => {
    const [available, redeemed] = await Promise.all([
      prisma.customer.count({ where: { businessId, totalStamps: { gte: m.atStamp } } }),
      prisma.stamp.count({   where: { businessId, isRedeem: true, rewardLabel: m.prizeName } }),
    ]);
    return { ...m, available, redeemed };
  }));
  return res.json({ milestones: enriched });
}
