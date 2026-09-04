import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const tagihans = await prisma.tagihan.findMany({
      where: {
        OR: [
          { notes: { contains: 'BEASISWA_INFO' } },
          { notes: { contains: 'DISCOUNT_INFO' } },
        ],
      },
    });

    console.log(`Processing ${tagihans.length} tagihans with discount/beasiswa...`);

    for (const t of tagihans) {
      const notes = t.notes || '';
      const beasiswaMatch = notes.match(/BEASISWA_INFO:\s*(\{.*?\})/);
      const discountMatch = notes.match(/DISCOUNT_INFO:\s*(\{.*?\})/);

      let originalAmount = t.amount;
      let pct = 0;
      let reason = 'Beasiswa';

      // If we have both or any, extract the true original amount and percentage
      if (discountMatch) {
        try {
          const discountInfo = JSON.parse(discountMatch[1]);
          originalAmount = discountInfo.originalAmount || originalAmount;
          pct = discountInfo.discountPercentage || pct;
          reason = discountInfo.reason || reason;
        } catch {}
      }
      if (beasiswaMatch) {
        try {
          const beasiswaInfo = JSON.parse(beasiswaMatch[1]);
          // If discountMatch set originalAmount, keep it since it is the oldest (original)
          if (!discountMatch) {
            originalAmount = beasiswaInfo.originalAmount || originalAmount;
          }
          pct = beasiswaInfo.beasiswaPercentage || pct;
          reason = beasiswaInfo.reason || reason;
        } catch {}
      }

      if (pct > 0) {
        const beasiswaAmount = Math.round(originalAmount * (pct / 100));
        const finalAmount = originalAmount - beasiswaAmount;

        let cleanNotes = notes
          .replace(/\s*\|\s*BEASISWA_INFO:\s*\{.*?\}/g, '')
          .replace(/^BEASISWA_INFO:\s*\{.*?\}/g, '')
          .replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '')
          .replace(/^DISCOUNT_INFO:\s*\{.*?\}/g, '')
          .trim();

        const beasiswaInfo = {
          originalAmount,
          beasiswaPercentage: pct,
          beasiswaAmount,
          finalAmount,
          reason,
        };

        const updatedNotes = `${cleanNotes ? cleanNotes + ' | ' : ''}BEASISWA_INFO: ${JSON.stringify(beasiswaInfo)}`;

        await prisma.tagihan.update({
          where: { id: t.id },
          data: {
            amount: finalAmount,
            notes: updatedNotes,
            status: finalAmount === 0 ? 'LUNAS' : t.amountPaid >= finalAmount ? 'LUNAS' : 'BELUM_LUNAS',
            paidDate: finalAmount === 0 ? (t.paidDate || new Date()) : t.amountPaid >= finalAmount ? t.paidDate : null,
          },
        });

        console.log(`Updated tagihan ${t.id}: amount corrected from ${t.amount} to ${finalAmount}`);
      }
    }
    console.log('✅ Database fix completed.');
  } catch (err) {
    console.error('Error fixing database:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
