import { Client } from 'pg';

async function testConnection(host: string, dbName: string) {
  const url = `postgresql://postgres:7VntvSH7qpV3d2dW@${host}:5432/${dbName}?sslmode=require`;
  try {
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 3000 });
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`Success on ${host} / ${dbName}:`, res.rows[0]);
    await client.end();
    return true;
  } catch (e) {
    console.log(`Failed on ${host} / ${dbName}:`, e.message);
    return false;
  }
}

async function runTests() {
  const subdomain = 'nhldvtymiijrsqmhfrrp';
  const region = 'ap-southeast-1';
  const hosts = [
    `db.${subdomain}.nhost.run`,
    `db.${region}.nhost.run`,
    `${subdomain}.db.${region}.nhost.run`,
    `db.${subdomain}.${region}.nhost.run`,
    `${region}.db.${subdomain}.nhost.run`,
    `postgres.${subdomain}.nhost.run`,
    `postgres.${region}.nhost.run`
  ];
  
  const dbs = [subdomain, 'postgres'];

  for (const host of hosts) {
    for (const dbName of dbs) {
      const success = await testConnection(host, dbName);
      if (success) return;
    }
  }
}

runTests();
