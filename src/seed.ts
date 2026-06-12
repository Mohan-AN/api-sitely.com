import { eq, count } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import bcrypt from 'bcryptjs';
import * as schema from './db/schema';

// Run via: wrangler dev --script-path src/seed.ts --once
// Or call POST /seed when running locally

export default {
  async fetch(req: Request, env: Record<string, string>): Promise<Response> {
    if (req.method !== 'POST') {
      return new Response('Send POST /seed to create admin', { status: 200 });
    }

    const databaseUrl = env['DB_URL'];
    const adminName = env['SEED_ADMIN_NAME'] ?? 'Admin';
    const adminEmail = env['SEED_ADMIN_EMAIL'];
    const adminPassword = env['SEED_ADMIN_PASSWORD'];

    if (!databaseUrl || !adminEmail || !adminPassword) {
      return new Response('Missing DB_URL, SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD in .env', { status: 400 });
    }

    const sql = neon(databaseUrl);
    const db = drizzle(sql, { schema });

    const existing = await db.select({ total: count() }).from(schema.users).where(eq(schema.users.role, 'admin'));
    if ((existing[0]?.total ?? 0) > 0) {
      return new Response(JSON.stringify({ message: 'Admin already exists — seed skipped' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await db.insert(schema.users).values({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'admin',
    });

    // Seed default settings
    await db
      .insert(schema.settings)
      .values({ key: 'renewal_window_days', value: '30' })
      .onConflictDoNothing();

    return new Response(
      JSON.stringify({ message: `Admin created — ${adminEmail}` }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  },
};
