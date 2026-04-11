import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

export async function sendPush(req, res) {
  const { title, body, segment } = req.body;
  const businessId = req.businessId;

  const customers = await getSegment(businessId, segment);
  const tokens = customers.map(c => c.pushToken).filter(Boolean);

  if (tokens.length === 0) {
    return res.status(200).json({ ok: true, sent: 0, message: 'Sin destinatarios con push token' });
  }

  const msg = await prisma.pushMessage.create({
    data: { businessId, title, body, segment, recipientCount: tokens.length },
  });

  try {
    if (env.PUSH_PROVIDER === 'onesignal' && env.ONESIGNAL_APP_ID && env.ONESIGNAL_API_KEY) {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${env.ONESIGNAL_API_KEY}` },
        body: JSON.stringify({ app_id: env.ONESIGNAL_APP_ID, include_player_ids: tokens, headings: { en: title }, contents: { en: body } }),
      });
      if (!response.ok) throw new Error('OneSignal error');
    } else {
      logger.info('PUSH_SIMULATED', { title, recipients: tokens.length });
    }
    await prisma.pushMessage.update({ where: { id: msg.id }, data: { status: 'SENT', sentAt: new Date() } });
  } catch (err) {
    logger.error('PUSH_FAILED', { message: err.message });
    await prisma.pushMessage.update({ where: { id: msg.id }, data: { status: 'FAILED' } });
    return res.status(500).json({ error: 'Error al enviar notificaciones' });
  }

  return res.json({ ok: true, sent: tokens.length, messageId: msg.id });
}

export async function pushHistory(req, res) {
  const messages = await prisma.pushMessage.findMany({ where: { businessId: req.businessId }, orderBy: { createdAt: 'desc' }, take: 50 });
  return res.json({ messages });
}

async function getSegment(businessId, segment) {
  const base = { businessId, pushToken: { not: null } };
  if (segment === 'all') return prisma.customer.findMany({ where: base, select: { pushToken: true } });
  if (segment === 'complete') {
    const biz = await prisma.business.findUnique({ where: { id: businessId }, select: { totalStamps: true } });
    return prisma.customer.findMany({ where: { ...base, totalStamps: { gte: biz?.totalStamps ?? 10 } }, select: { pushToken: true } });
  }
  if (segment === 'inactive') {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return prisma.customer.findMany({ where: { ...base, updatedAt: { lt: cutoff } }, select: { pushToken: true } });
  }
  if (segment === 'new') {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return prisma.customer.findMany({ where: { ...base, createdAt: { gte: cutoff } }, select: { pushToken: true } });
  }
  return [];
}
