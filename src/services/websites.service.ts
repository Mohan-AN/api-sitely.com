import { eq, ilike, and, count, sql, or, lt, lte, gte, desc } from 'drizzle-orm';
import { Db } from '../db/client';
import { websites, clients, activityLog, users, settings } from '../db/schema';
import { generateWebsiteId } from '../utils/id-generator';
import { logActivity } from './activity.service';
import { runExpiryCheckOncePerDay } from './expiry.service';
import { validateStatusTransition, isOverdue, getAllowedActions } from '../utils/status-rules';
import type { WebsiteActivity, WebsiteDetail, WebsiteStats, WebsiteWithMeta } from '../types/website.types';
import type { PaginatedData } from '../types/common.types';

type WebsiteListQuery = {
  clientId?: string;
  websiteStatus?: string;
  maintenanceStatus?: string;
  siteType?: string;
  platform?: string;
  overdueOnly?: boolean;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  page: number;
  limit: number;
};

const sortableColumns = {
  websiteId: websites.websiteId,
  projectName: websites.projectName,
  clientName: clients.name,
  url: websites.url,
  siteType: websites.siteType,
  platform: websites.platform,
  websiteStatus: websites.websiteStatus,
  maintenanceStatus: websites.maintenanceStatus,
  renewalDate: websites.renewalDate,
  createdAt: websites.createdAt,
  updatedAt: websites.updatedAt,
} as const;

function overdueCondition(today: string) {
  return and(
    lt(websites.renewalDate, today),
    or(
      sql`${websites.lastPaymentReceived} is null`,
      lt(websites.lastPaymentReceived, websites.renewalDate),
    ),
  );
}

function listOrderBy(q: WebsiteListQuery) {
  if (!q.sortBy) return sql`${websites.renewalDate} asc nulls last`;

  const column = sortableColumns[q.sortBy as keyof typeof sortableColumns];
  if (!column) return sql`${websites.renewalDate} asc nulls last`;

  return q.sortOrder === 'desc' ? sql`${column} desc nulls last` : sql`${column} asc nulls last`;
}

export async function listWebsites(db: Db, q: WebsiteListQuery): Promise<PaginatedData<WebsiteWithMeta>> {
  await runExpiryCheckOncePerDay(db);

  const offset = (q.page - 1) * q.limit;
  const today = new Date().toISOString().split('T')[0]!;

  const conditions = [];
  if (q.clientId) conditions.push(eq(websites.clientId, q.clientId));
  if (q.websiteStatus) conditions.push(eq(websites.websiteStatus, q.websiteStatus));
  if (q.maintenanceStatus) conditions.push(eq(websites.maintenanceStatus, q.maintenanceStatus));
  if (q.siteType) conditions.push(eq(websites.siteType, q.siteType));
  if (q.platform) conditions.push(eq(websites.platform, q.platform));
  if (q.overdueOnly === true) conditions.push(overdueCondition(today));
  if (q.search) conditions.push(ilike(websites.projectName, `%${q.search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        websiteId: websites.websiteId,
        clientId: websites.clientId,
        projectName: websites.projectName,
        url: websites.url,
        siteType: websites.siteType,
        platform: websites.platform,
        websiteStatus: websites.websiteStatus,
        maintenanceStatus: websites.maintenanceStatus,
        startDate: websites.startDate,
        hostedDate: websites.hostedDate,
        lastInvoiceSent: websites.lastInvoiceSent,
        lastPaymentReceived: websites.lastPaymentReceived,
        renewalDate: websites.renewalDate,
        remarks: websites.remarks,
        createdAt: websites.createdAt,
        updatedAt: websites.updatedAt,
        clientName: clients.name,
      })
      .from(websites)
      .innerJoin(clients, eq(clients.clientId, websites.clientId))
      .where(where)
      .orderBy(listOrderBy(q))
      .limit(q.limit)
      .offset(offset),
    db.select({ total: count() }).from(websites).where(where),
  ]);

  const total = countResult[0]?.total ?? 0;

  return {
    items: rows.map((r) => ({
      ...r,
      startDate: r.startDate ?? null,
      hostedDate: r.hostedDate ?? null,
      lastInvoiceSent: r.lastInvoiceSent ?? null,
      lastPaymentReceived: r.lastPaymentReceived ?? null,
      renewalDate: r.renewalDate ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      isOverdue: isOverdue(r.renewalDate ?? null, r.lastPaymentReceived ?? null),
    })),
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
  };
}

export async function getWebsiteStats(db: Db): Promise<WebsiteStats> {
  await runExpiryCheckOncePerDay(db);

  const today = new Date().toISOString().split('T')[0]!;

  const windowRow = await db.select().from(settings).where(eq(settings.key, 'renewal_window_days'));
  const windowDays = parseInt(windowRow[0]?.value ?? '30', 10);
  const windowDate = new Date();
  windowDate.setDate(windowDate.getDate() + windowDays);
  const windowDateStr = windowDate.toISOString().split('T')[0]!;

  const [
    websiteCount,
    clientCount,
    liveCount,
    expiredCount,
    dueSoonCount,
  ] = await Promise.all([
    db.select({ total: count() }).from(websites),
    db.select({ total: count() }).from(clients),
    db.select({ total: count() }).from(websites).where(eq(websites.websiteStatus, 'Live')),
    db.select({ total: count() }).from(websites).where(eq(websites.maintenanceStatus, 'Expired')),
    db
      .select({ total: count() })
      .from(websites)
      .where(
        and(
          eq(websites.maintenanceStatus, 'Active'),
          gte(websites.renewalDate, today),
          lte(websites.renewalDate, windowDateStr),
        ),
      ),
  ]);

  return {
    websites: websiteCount[0]?.total ?? 0,
    clients: clientCount[0]?.total ?? 0,
    live: liveCount[0]?.total ?? 0,
    expired: expiredCount[0]?.total ?? 0,
    dueSoon: dueSoonCount[0]?.total ?? 0,
  };
}

export async function createWebsite(
  db: Db,
  userId: string,
  input: {
    clientId: string;
    projectName: string;
    url?: string | null;
    siteType: string;
    platform: string;
    startDate?: string | null;
    hostedDate?: string | null;
    lastInvoiceSent?: string | null;
    lastPaymentReceived?: string | null;
    renewalDate?: string | null;
    remarks?: string | null;
  },
) {
  const clientRows = await db.select().from(clients).where(eq(clients.clientId, input.clientId));
  if (!clientRows[0]) return { error: 'Client not found' };

  const websiteId = await generateWebsiteId(db);

  const [row] = await db
    .insert(websites)
    .values({
      websiteId,
      clientId: input.clientId,
      projectName: input.projectName,
      url: input.url ?? null,
      siteType: input.siteType,
      platform: input.platform,
      startDate: input.startDate ?? null,
      hostedDate: input.hostedDate ?? null,
      lastInvoiceSent: input.lastInvoiceSent ?? null,
      lastPaymentReceived: input.lastPaymentReceived ?? null,
      renewalDate: input.renewalDate ?? null,
      remarks: input.remarks ?? null,
    })
    .returning();

  if (!row) throw new Error('Insert failed');

  await logActivity({
    db,
    userId,
    action: 'create',
    entityType: 'website',
    entityId: websiteId,
    description: `${websiteId} created — ${row.projectName} (${input.clientId})`,
  });

  return { data: { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } };
}

export async function getWebsite(db: Db, websiteId: string): Promise<WebsiteDetail | null> {
  const rows = await db
    .select({
      websiteId: websites.websiteId,
      clientId: websites.clientId,
      projectName: websites.projectName,
      url: websites.url,
      siteType: websites.siteType,
      platform: websites.platform,
      websiteStatus: websites.websiteStatus,
      maintenanceStatus: websites.maintenanceStatus,
      startDate: websites.startDate,
      hostedDate: websites.hostedDate,
      lastInvoiceSent: websites.lastInvoiceSent,
      lastPaymentReceived: websites.lastPaymentReceived,
      renewalDate: websites.renewalDate,
      remarks: websites.remarks,
      createdAt: websites.createdAt,
      updatedAt: websites.updatedAt,
      clientName: clients.name,
    })
    .from(websites)
    .innerJoin(clients, eq(clients.clientId, websites.clientId))
    .where(eq(websites.websiteId, websiteId));

  const r = rows[0];
  if (!r) return null;

  const detail = {
    ...r,
    startDate: r.startDate ?? null,
    hostedDate: r.hostedDate ?? null,
    lastInvoiceSent: r.lastInvoiceSent ?? null,
    lastPaymentReceived: r.lastPaymentReceived ?? null,
    renewalDate: r.renewalDate ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    isOverdue: isOverdue(r.renewalDate ?? null, r.lastPaymentReceived ?? null),
  };

  return {
    ...detail,
    allowedActions: getAllowedActions(detail),
  };
}

export async function getWebsiteActivity(
  db: Db,
  websiteId: string,
  page: number,
  limit: number,
): Promise<PaginatedData<WebsiteActivity>> {
  const offset = (page - 1) * limit;
  const where = and(eq(activityLog.entityType, 'website'), eq(activityLog.entityId, websiteId));

  const [rows, countResult] = await Promise.all([
    db
      .select({
        logId: activityLog.logId,
        action: activityLog.action,
        description: activityLog.description,
        oldValue: activityLog.oldValue,
        newValue: activityLog.newValue,
        createdAt: activityLog.createdAt,
        userName: users.name,
      })
      .from(activityLog)
      .leftJoin(users, eq(users.userId, activityLog.userId))
      .where(where)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(activityLog).where(where),
  ]);

  const total = countResult[0]?.total ?? 0;

  return {
    items: rows.map((r) => ({
      ...r,
      userName: r.userName ?? 'System',
      createdAt: r.createdAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateWebsite(
  db: Db,
  userId: string,
  websiteId: string,
  input: {
    clientId?: string;
    projectName?: string;
    url?: string | null;
    siteType?: string;
    platform?: string;
    websiteStatus?: string;
    maintenanceStatus?: string;
    startDate?: string | null;
    hostedDate?: string | null;
    lastInvoiceSent?: string | null;
    lastPaymentReceived?: string | null;
    renewalDate?: string | null;
    remarks?: string | null;
  },
) {
  const existing = await getWebsite(db, websiteId);
  if (!existing) return { error: 'Website not found' };

  const validationMaintenanceStatus =
    input.websiteStatus === 'Discontinued' ? 'Cancelled' : input.maintenanceStatus;

  // Validate status transitions
  if (input.websiteStatus || input.maintenanceStatus) {
    const validation = validateStatusTransition({
      currentWebsiteStatus: existing.websiteStatus,
      currentMaintenanceStatus: existing.maintenanceStatus,
      newWebsiteStatus: input.websiteStatus,
      newMaintenanceStatus: validationMaintenanceStatus,
      url: input.url ?? existing.url,
      hostedDate: input.hostedDate ?? existing.hostedDate,
      renewalDate: input.renewalDate ?? existing.renewalDate,
    });
    if (!validation.ok) return { error: validation.error };
  }

  // Discontinued forces maintenance Cancelled
  const forcedMaintStatus =
    input.websiteStatus === 'Discontinued' ? 'Cancelled' : input.maintenanceStatus;

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  const fields = [
    'clientId', 'projectName', 'url', 'siteType', 'platform',
    'startDate', 'hostedDate', 'lastInvoiceSent', 'lastPaymentReceived',
    'renewalDate', 'remarks',
  ] as const;

  for (const f of fields) {
    if (f in input && input[f] !== undefined) updates[f] = input[f];
  }

  if (input.websiteStatus) updates['websiteStatus'] = input.websiteStatus;
  if (forcedMaintStatus) updates['maintenanceStatus'] = forcedMaintStatus;

  const [updated] = await db
    .update(websites)
    .set(updates)
    .where(eq(websites.websiteId, websiteId))
    .returning();

  if (!updated) return { error: 'Update failed' };

  // Activity log
  const logs: Array<Promise<void>> = [];

  if (input.websiteStatus && input.websiteStatus !== existing.websiteStatus) {
    logs.push(logActivity({
      db, userId, action: 'status_change', entityType: 'website', entityId: websiteId,
      description: `${websiteId}: website_status ${existing.websiteStatus} → ${input.websiteStatus}`,
      oldValue: { websiteStatus: existing.websiteStatus },
      newValue: { websiteStatus: input.websiteStatus },
    }));
  }

  if (forcedMaintStatus && forcedMaintStatus !== existing.maintenanceStatus) {
    logs.push(logActivity({
      db, userId, action: 'status_change', entityType: 'website', entityId: websiteId,
      description: `${websiteId}: maintenance_status ${existing.maintenanceStatus} → ${forcedMaintStatus}`,
      oldValue: { maintenanceStatus: existing.maintenanceStatus },
      newValue: { maintenanceStatus: forcedMaintStatus },
    }));
  }


  if (logs.length === 0) {
    const changedFields = Object.keys(input).join(', ');
    logs.push(logActivity({
      db, userId, action: 'update', entityType: 'website', entityId: websiteId,
      description: `${websiteId} updated — ${changedFields} changed`,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    }));
  }

  await Promise.all(logs);

  return {
    data: {
      ...updated,
      startDate: updated.startDate ?? null,
      hostedDate: updated.hostedDate ?? null,
      lastInvoiceSent: updated.lastInvoiceSent ?? null,
      lastPaymentReceived: updated.lastPaymentReceived ?? null,
      renewalDate: updated.renewalDate ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  };
}
