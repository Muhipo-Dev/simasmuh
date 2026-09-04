import { Client } from 'pg';

async function migrate() {
  const sourceUrl = 'postgresql://postgres.eclsupyhhbkghvxrnfgr:muhipoDev48!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true';
  const targetUrl = 'postgresql://postgres:7VntvSH7qpV3d2dW@nhldvtymiijrsqmhfrrp.db.ap-southeast-1.nhost.run:5432/nhldvtymiijrsqmhfrrp?sslmode=require';

  const sourceClient = new Client({ connectionString: sourceUrl });
  const targetClient = new Client({ connectionString: targetUrl });

  try {
    await sourceClient.connect();
    await targetClient.connect();
    console.log('Connected to both databases');

    // order is important for foreign keys
    const tables = [
      'Setting',
      'User',
      'Class',
      'TeacherProfile',
      'Student',
      'Subject',
      'Schedule',
      'Attendance',
      'DailyAttendance',
      'Grade',
      'TeachingJournal',
      'HomeroomJournal',
      'Announcement',
      'StaffJournal',
      'IzinKeluar',
      'Payment',
      'Tagihan',
      'Pengeluaran',
      'FileHash',
      'PaymentProof',
      'NotificationTemplate',
      'Notification'
    ];

    for (const table of tables) {
      console.log(`Migrating table: ${table}`);
      const res = await sourceClient.query(`SELECT * FROM "${table}"`);
      const rows = res.rows;
      if (rows.length === 0) {
        console.log(`  No data in ${table}`);
        continue;
      }
      
      const columns = Object.keys(rows[0]).map(c => `"${c}"`).join(', ');
      
      for (const row of rows) {
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        try {
          await targetClient.query(`INSERT INTO "${table}" (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
        } catch (e) {
          console.error(`  Error inserting row into ${table}:`, e.message);
        }
      }
      console.log(`  Inserted ${rows.length} rows into ${table}`);
    }

    console.log('Migration completed successfully!');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

migrate();
