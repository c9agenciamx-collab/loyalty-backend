import { Router } from 'express';
import { generalLimiter, sensitiveLimit, stampLimiter } from '../middleware/rateLimiter.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateBusinessSchema, createMilestoneSchema, giveStampSchema, redeemSchema, sendPushSchema, exportSchema } from '../validators/index.js';
import { z } from 'zod';
import * as stampCtrl  from '../controllers/stamp.controller.js';
import * as pushCtrl   from '../controllers/push.controller.js';
import * as exportCtrl from '../controllers/export.controller.js';
import * as bizCtrl    from '../controllers/business.controller.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(requireAdmin);

router.get   ('/business',            generalLimiter, bizCtrl.getBusiness);
router.patch ('/business',            sensitiveLimit, validate(updateBusinessSchema), async (req, res) => {
  const biz = await prisma.business.update({ where: { id: req.businessId }, data: req.body });
  res.json(biz);
});
router.patch('/business/logo',        sensitiveLimit, validate(z.object({ logoUrl: z.string().url().nullable() })), bizCtrl.updateLogo);
router.patch('/business/stamp-icon',  sensitiveLimit, validate(z.object({ stampIconUrl: z.string().url().nullable() })), bizCtrl.updateStampIcon);
router.get  ('/stats/dashboard',      generalLimiter, bizCtrl.dashboardStats);
router.get  ('/rewards/active',       generalLimiter, bizCtrl.activeRewards);

router.get('/milestones', generalLimiter, async (req, res) => {
  const milestones = await prisma.milestone.findMany({ where: { businessId: req.businessId, active: true }, orderBy: { atStamp: 'asc' } });
  res.json({ milestones });
});
router.post('/milestones', generalLimiter, validate(createMilestoneSchema), async (req, res) => {
  const m = await prisma.milestone.create({ data: { ...req.body, businessId: req.businessId } });
  res.status(201).json(m);
});
router.delete('/milestones/:id', generalLimiter, async (req, res) => {
  await prisma.milestone.update({ where: { id: req.params.id, businessId: req.businessId }, data: { active: false } });
  res.json({ ok: true });
});

router.post('/stamps/give',    stampLimiter,   validate(giveStampSchema), stampCtrl.giveStamp);
router.post('/stamps/redeem',  stampLimiter,   validate(redeemSchema),    stampCtrl.redeemReward);
router.get ('/stamps/history', generalLimiter,                            stampCtrl.stampHistory);

router.get('/customers', generalLimiter, async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page ?? '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit ?? '20', 10));
  const search = (req.query.search ?? '').trim().slice(0, 100);
  const where = { businessId: req.businessId, ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { cardCode: { contains: search } }] } : {}) };
  const [customers, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, select: { id: true, name: true, email: true, phone: true, cardCode: true, totalStamps: true, walletType: true, createdAt: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.customer.count({ where }),
  ]);
  res.json({ customers, total, page, pages: Math.ceil(total / limit) });
});

router.post('/push/send',    sensitiveLimit, validate(sendPushSchema), pushCtrl.sendPush);
router.get ('/push/history', generalLimiter,                           pushCtrl.pushHistory);

router.get('/fraud/logs', sensitiveLimit, async (req, res) => {
  const logs = await prisma.fraudLog.findMany({ where: { businessId: req.businessId }, orderBy: { createdAt: 'desc' }, take: 100, include: { customer: { select: { name: true, cardCode: true } } } });
  res.json({ logs });
});

router.post('/export', sensitiveLimit, validate(exportSchema), exportCtrl.exportCustomers);

export default router;
