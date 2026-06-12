import { eq, ilike, or, sql, count } from 'drizzle-orm';
import { Db } from '../db/client';
import { clients, websites } from '../db/schema';
import { generateClientId } from '../utils/id-generator';
import { logActivity } from './activity.service';
import type { ClientWithCount, ClientDetail } from '../types/client.types';
import type { PaginatedData } from '../types/common.types';

export async function listClients(
  db: Db,
  search: string | undefined,
  page: number,
  limit: number,
): Promise<PaginatedData<ClientWithCount>> {
  const offset = (page - 1) * limit;

  const where = search
    ? or(ilike(clients.name, `%${search}%`), ilike(clients.company, `%${search}%`))
    : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        clientId: clients.clientId,
        name: clients.name,
        company: clients.company,
        phone: clients.phone,
        email: clients.email,
        city: clients.city,
        isActive: clients.isActive,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        websiteCount: sql<number>`cast(count(${websites.websiteId}) as integer)`,
      })
      .from(clients)
      .leftJoin(websites, eq(websites.clientId, clients.clientId))
      .where(where)
      .groupBy(clients.clientId)
      .orderBy(clients.createdAt)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(clients).where(where),
  ]);

  const total = countResult[0]?.total ?? 0;

  return {
    items: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function createClient(
  db: Db,
  userId: string,
  input: { name: string; company?: string; phone?: string; email?: string; city?: string },
) {
  const clientId = await generateClientId(db);

  const [row] = await db
    .insert(clients)
    .values({
      clientId,
      name: input.name,
      company: input.company ?? null,
      phone: input.phone ?? null,
      email: input.email || null,
      city: input.city ?? null,
    })
    .returning();

  if (!row) throw new Error('Insert failed');

  await logActivity({
    db,
    userId,
    action: 'create',
    entityType: 'client',
    entityId: clientId,
    description: `${clientId} created — ${row.name}`,
  });

  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export async function getClient(db: Db, clientId: string): Promise<ClientDetail | null> {
  const clientRows = await db.select().from(clients).where(eq(clients.clientId, clientId));
  if (!clientRows[0]) return null;

  const clientRow = clientRows[0];
  const websiteRows = await db
    .select({
      websiteId: websites.websiteId,
      projectName: websites.projectName,
      url: websites.url,
      websiteStatus: websites.websiteStatus,
      maintenanceStatus: websites.maintenanceStatus,
      serviceType: websites.serviceType,
    })
    .from(websites)
    .where(eq(websites.clientId, clientId));

  return {
    ...clientRow,
    createdAt: clientRow.createdAt.toISOString(),
    updatedAt: clientRow.updatedAt.toISOString(),
    websites: websiteRows,
  };
}

export async function updateClient(
  db: Db,
  userId: string,
  clientId: string,
  input: Partial<{ name: string; company: string; phone: string; email: string; city: string }>,
) {
  const existing = await db.select().from(clients).where(eq(clients.clientId, clientId));
  if (!existing[0]) return null;

  const [updated] = await db
    .update(clients)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(clients.clientId, clientId))
    .returning();

  if (!updated) return null;

  const changedFields = Object.keys(input).join(', ');

  await logActivity({
    db,
    userId,
    action: 'update',
    entityType: 'client',
    entityId: clientId,
    description: `${clientId} updated — ${changedFields} changed`,
    oldValue: existing[0] as Record<string, unknown>,
    newValue: updated as Record<string, unknown>,
  });

  return { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
}
