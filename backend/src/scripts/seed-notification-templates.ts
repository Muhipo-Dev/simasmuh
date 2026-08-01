import { PrismaService } from '../modules/core/prisma/prisma.service';
import { seedNotificationTemplates } from '../modules/communication/notifications/notification-templates.seed';

async function main() {
  const prisma = new PrismaService();
  
  try {
    await seedNotificationTemplates(prisma);
    console.log('Notification templates seeded successfully');
  } catch (error) {
    console.error('Error seeding notification templates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();