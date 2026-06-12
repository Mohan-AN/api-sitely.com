import { Db } from '../db/client';
import { clients, websites } from '../db/schema';
import { sql } from 'drizzle-orm';

export async function generateClientId(db: Db): Promise<string> {
  const result = await db
    .select({ max: sql<string>`max(substring(client_id from 5)::integer)` })
    .from(clients);
  const max = parseInt(result[0]?.max ?? '0') || 0;
  const next = max + 1;
  return `CLT-${String(next).padStart(3, '0')}`;
}

export async function generateWebsiteId(db: Db): Promise<string> {
  const result = await db
    .select({ max: sql<string>`max(substring(website_id from 5)::integer)` })
    .from(websites);
  const max = parseInt(result[0]?.max ?? '0') || 0;
  const next = max + 1;
  return `WEB-${String(next).padStart(3, '0')}`;
}
