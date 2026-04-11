import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('No ejecutes seeds en producción');
  }

  const business = await prisma.business.upsert({
    where:  { slug: 'cafe-aroma-demo' },
    update: {},
    create: {
      name: 'Café Aroma', slug: 'cafe-aroma-demo',
      cardTitle: 'Tarjeta Premium', rewardText: '10 sellos = 1 café gratis',
      totalStamps: 10, colorBg: '#1a1a1a', colorText: '#ffffff', colorStampBg: '#f5c518',
    },
  });

  const passwordHash = await bcrypt.hash('Admin1234!', 12);
  await prisma.admin.upsert({
    where:  { email: 'admin@cafearoma.com' },
    update: {},
    create: { businessId: business.id, name: 'Admin Demo', email: 'admin@cafearoma.com', passwordHash },
  });

  await prisma.milestone.createMany({
    skipDuplicates: true,
    data: [
      { businessId: business.id, atStamp: 4,  prizeName: 'Café mediano gratis' },
      { businessId: business.id, atStamp: 10, prizeName: 'Bebida premium gratis' },
    ],
  });

  console.log('✅ Seed completado');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
