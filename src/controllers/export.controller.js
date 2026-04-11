import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const FIELD_LABELS = {
  name: 'Nombre', email: 'Email', phone: 'Teléfono',
  totalStamps: 'Sellos acumulados', redeemedCount: 'Premios canjeados',
  createdAt: 'Fecha de registro', lastVisit: 'Última visita', cardCode: 'ID de tarjeta',
};

export async function exportCustomers(req, res) {
  const { fields, format } = req.body;
  const businessId = req.businessId;

  logger.info('DATA_EXPORT', { businessId, adminId: req.admin.id, fields, format });

  const customers = await prisma.customer.findMany({
    where: { businessId },
    select: {
      name:        fields.includes('name'),
      email:       fields.includes('email'),
      phone:       fields.includes('phone'),
      totalStamps: fields.includes('totalStamps'),
      createdAt:   fields.includes('createdAt') || fields.includes('lastVisit'),
      cardCode:    fields.includes('cardCode'),
      stamps: fields.includes('redeemedCount') || fields.includes('lastVisit')
        ? { select: { createdAt: true, isRedeem: true }, orderBy: { createdAt: 'desc' } }
        : false,
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = customers.map(c => {
    const row = {};
    if (fields.includes('name'))          row.name          = c.name ?? '';
    if (fields.includes('email'))         row.email         = c.email ?? '';
    if (fields.includes('phone'))         row.phone         = c.phone ?? '';
    if (fields.includes('totalStamps'))   row.totalStamps   = c.totalStamps;
    if (fields.includes('redeemedCount')) row.redeemedCount = c.stamps?.filter(s => s.isRedeem).length ?? 0;
    if (fields.includes('createdAt'))     row.createdAt     = c.createdAt?.toISOString().split('T')[0] ?? '';
    if (fields.includes('lastVisit'))     row.lastVisit     = c.stamps?.[0]?.createdAt?.toISOString().split('T')[0] ?? 'Nunca';
    if (fields.includes('cardCode'))      row.cardCode      = c.cardCode ?? '';
    return row;
  });

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="clientes-lealtad.json"');
    return res.json(rows);
  }

  function escapeCsv(val) {
    const str = String(val ?? '');
    const safe = str.replace(/^[=+\-@\t\r]/, "'$&");
    return `"${safe.replace(/"/g, '""')}"`;
  }

  const headers = fields.map(f => FIELD_LABELS[f] ?? f);
  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => fields.map(f => escapeCsv(row[f])).join(',')),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="clientes-lealtad.csv"');
  return res.send('\uFEFF' + csvLines.join('\n'));
}
