const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://postgres.eclsupyhhbkghvxrnfgr:muhipoDev48!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res1 = await client.query("UPDATE \"User\" SET role = 'ADMIN_IT' WHERE role = 'SUPERADMIN'");
  const res2 = await client.query("UPDATE \"User\" SET \"subRole\" = 'ADMIN_IT' WHERE \"subRole\" = 'SUPERADMIN'");
  const res3 = await client.query("UPDATE \"User\" SET \"subRole2\" = 'ADMIN_IT' WHERE \"subRole2\" = 'SUPERADMIN'");
  const res4 = await client.query("UPDATE \"User\" SET \"subRole3\" = 'ADMIN_IT' WHERE \"subRole3\" = 'SUPERADMIN'");
  console.log("Updated rows:", res1.rowCount, res2.rowCount, res3.rowCount, res4.rowCount);
  await client.end();
}

run().catch(console.error);
