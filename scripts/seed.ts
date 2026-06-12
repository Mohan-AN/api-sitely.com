import { eq, count } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import bcrypt from 'bcryptjs';
import * as schema from '../src/db/schema';

const databaseUrl = process.env['DB_URL'];
const adminName = process.env['SEED_ADMIN_NAME'] ?? 'Admin';
const adminEmail = process.env['SEED_ADMIN_EMAIL'];
const adminPassword = process.env['SEED_ADMIN_PASSWORD'];

async function main() {
  if (!databaseUrl || !adminEmail || !adminPassword) {
    console.error('DB_URL, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  const existing = await db.select({ total: count() }).from(schema.users).where(eq(schema.users.role, 'admin'));
  if ((existing[0]?.total ?? 0) > 0) {
    console.log('Admin already exists - seed skipped.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await db.insert(schema.users).values({
    name: adminName,
    email: adminEmail,
    passwordHash,
    role: 'admin',
  });

  await db
    .insert(schema.settings)
    .values({ key: 'renewal_window_days', value: '30' })
    .onConflictDoNothing();

  console.log(`Admin created - ${adminEmail}`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
