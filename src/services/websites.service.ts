import { eq, ilike, and, count, sql } from 'drizzle-orm';
import { Db } from '../db/client';
import { websites, clients } from '../db/schema';
import { generateWebsiteId } from '../utils/id-generator';
import { logActivity } from './activity.service';
import { validateStatusTransition, isOverdue } from '../utils/status-rules';
import type { WebsiteWithMeta } from '../types/website.types';
import type { PaginatedData } from '../types/common.types';

type WebsiteListQuery = {
  clientId?: string;
  websiteStatus?: string;
  maintenanceStatus?: string;
  serviceType?: string;
  siteType?: string;
  platform?: string;
  transferPending?: boolean;
  search?: string;
  page: number;
  limit: number;
};

export async function listWebsites(db: Db, q: WebsiteListQuery): Promise<PaginatedData<WebsiteWithMeta>> {
  const offset = (q.page - 1) * q.limit;

  const conditions = [];
  if (q.clientId) conditions.push(eq(websites.clientId, q.clientId));
  if (q.websiteStatus) conditions.push(eq(websites.websiteStatus, q.websiteStatus));
  if (q.maintenanceStatus) conditions.push(eq(websites.maintenanceStatus, q.maintenanceStatus));
  if (q.serviceType) conditions.push(eq(websites.serviceType, q.serviceType));
  if (q.siteType) conditions.push(eq(websites.siteType, q.siteType));
  if (q.platform) conditions.push(eq(websites.platform, q.platform));
  if (q.transferPending === true) conditions.push(eq(websites.transferCompleted, false));
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
        serviceType: websites.serviceType,
        websiteStatus: websites.websiteStatus,
        maintenanceStatus: websites.maintenanceStatus,
        startDate: websites.startDate,
        hostedDate: websites.hostedDate,
        lastInvoiceSent: websites.lastInvoiceSent,
        lastPaymentReceived: websites.lastPaymentReceived,
        renewalDate: websites.renewalDate,
        handoverDate: websites.handoverDate,
        transferCompleted: websites.transferCompleted,
        serviceTypeChangedAt: websites.serviceTypeChangedAt,
        remarks: websites.remarks,
        createdAt: websites.createdAt,
        updatedAt: websites.updatedAt,
        clientName: clients.name,
      })
      .from(websites)
      .innerJoin(clients, eq(clients.clientId, websites.clientId))
      .where(where)
      .orderBy(websites.createdAt)
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
      handoverDate: r.handoverDate ?? null,
      serviceTypeChangedAt: r.serviceTypeChangedAt ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      isOverdue: isOverdue(r.serviceType, r.renewalDate ?? null, r.lastPaymentReceived ?? null),
    })),
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
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
    serviceType: string;
    startDate?: string | null;
    hostedDate?: string | null;
    lastInvoiceSent?: string | null;
    lastPaymentReceived?: string | null;
    renewalDate?: string | null;
    handoverDate?: string | null;
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
      serviceType: input.serviceType,
      startDate: input.startDate ?? null,
      hostedDate: input.hostedDate ?? null,
      lastInvoiceSent: input.lastInvoiceSent ?? null,
      lastPaymentReceived: input.lastPaymentReceived ?? null,
      renewalDate: input.renewalDate ?? null,
      handoverDate: input.handoverDate ?? null,
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

export async function getWebsite(db: Db, websiteId: string): Promise<WebsiteWithMeta | null> {
  const rows = await db
    .select({
      websiteId: websites.websiteId,
      clientId: websites.clientId,
      projectName: websites.projectName,
      url: websites.url,
      siteType: websites.siteType,
      platform: websites.platform,
      serviceType: websites.serviceType,
      websiteStatus: websites.websiteStatus,
      maintenanceStatus: websites.maintenanceStatus,
      startDate: websites.startDate,
      hostedDate: websites.hostedDate,
      lastInvoiceSent: websites.lastInvoiceSent,
      lastPaymentReceived: websites.lastPaymentReceived,
      renewalDate: websites.renewalDate,
      handoverDate: websites.handoverDate,
      transferCompleted: websites.transferCompleted,
      serviceTypeChangedAt: websites.serviceTypeChangedAt,
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

  return {
    ...r,
    startDate: r.startDate ?? null,
    hostedDate: r.hostedDate ?? null,
    lastInvoiceSent: r.lastInvoiceSent ?? null,
    lastPaymentReceived: r.lastPaymentReceived ?? null,
    renewalDate: r.renewalDate ?? null,
    handoverDate: r.handoverDate ?? null,
    serviceTypeChangedAt: r.serviceTypeChangedAt ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    isOverdue: isOverdue(r.serviceType, r.renewalDate ?? null, r.lastPaymentReceived ?? null),
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
    serviceType?: string;
    websiteStatus?: string;
    maintenanceStatus?: string;
    startDate?: string | null;
    hostedDate?: string | null;
    lastInvoiceSent?: string | null;
    lastPaymentReceived?: string | null;
    renewalDate?: string | null;
    handoverDate?: string | null;
    transferCompleted?: boolean;
    remarks?: string | null;
  },
) {
  const existing = await getWebsite(db, websiteId);
  if (!existing) return { error: 'Website not found' };

  const effectiveServiceType = input.serviceType ?? existing.serviceType;
  const today = new Date().toISOString().split('T')[0]!;

  // Validate status transitions
  if (input.websiteStatus || input.maintenanceStatus) {
    const validation = validateStatusTransition({
      currentWebsiteStatus: existing.websiteStatus,
      currentMaintenanceStatus: existing.maintenanceStatus,
      newWebsiteStatus: input.websiteStatus,
      newMaintenanceStatus: input.maintenanceStatus,
      url: input.url ?? existing.url,
      hostedDate: input.hostedDate ?? existing.hostedDate,
      renewalDate: input.renewalDate ?? existing.renewalDate,
      handoverDate: input.handoverDate ?? existing.handoverDate,
      serviceType: effectiveServiceType,
    });
    if (!validation.ok) return { error: validation.error };
  }

  // Discontinued forces maintenance Cancelled
  const forcedMaintStatus =
    input.websiteStatus === 'Discontinued' ? 'Cancelled' : input.maintenanceStatus;

  // Type conversion: TO handover forces maintenance Cancelled; stamp changed_at
  let serviceTypeChangedAt = existing.serviceTypeChangedAt;
  if (input.serviceType && input.serviceType !== existing.serviceType) {
    if (existing.websiteStatus === 'Discontinued') {
      return { error: 'Cannot convert service type on a Discontinued website' };
    }
    if (input.serviceType === 'maintain' && !input.renewalDate && !existing.renewalDate) {
      return { error: 'Renewal date is required when converting to maintain' };
    }
    serviceTypeChangedAt = today;
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  const fields = [
    'clientId', 'projectName', 'url', 'siteType', 'platform', 'serviceType',
    'startDate', 'hostedDate', 'lastInvoiceSent', 'lastPaymentReceived',
    'renewalDate', 'handoverDate', 'transferCompleted', 'remarks',
  ] as const;

  for (const f of fields) {
    if (f in input && input[f] !== undefined) updates[f] = input[f];
  }

  if (input.websiteStatus) updates['websiteStatus'] = input.websiteStatus;
  if (forcedMaintStatus) updates['maintenanceStatus'] = forcedMaintStatus;
  if (serviceTypeChangedAt !== existing.serviceTypeChangedAt) {
    updates['serviceTypeChangedAt'] = serviceTypeChangedAt;
    if (input.serviceType === 'handover') updates['maintenanceStatus'] = 'Cancelled';
  }

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

  if (input.serviceType && input.serviceType !== existing.serviceType) {
    logs.push(logActivity({
      db, userId, action: 'type_conversion', entityType: 'website', entityId: websiteId,
      description: `${websiteId} converted ${existing.serviceType} → ${input.serviceType}`,
    }));
  }

  if (input.transferCompleted === true && !existing.transferCompleted) {
    logs.push(logActivity({
      db, userId, action: 'update', entityType: 'website', entityId: websiteId,
      description: `${websiteId} transfer to client completed`,
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
      handoverDate: updated.handoverDate ?? null,
      serviceTypeChangedAt: updated.serviceTypeChangedAt ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  };
}
