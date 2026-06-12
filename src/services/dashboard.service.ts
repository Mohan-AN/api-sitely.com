import { eq, sql, and, lte, gte, isNull, or, lt } from 'drizzle-orm';
import { Db } from '../db/client';
import { websites, clients, activityLog, users, settings } from '../db/schema';
import type { DashboardData } from '../types/dashboard.types';

export async function getDashboard(db: Db): Promise<DashboardData> {
  const today = new Date().toISOString().split('T')[0]!;

  // Get renewal window from settings
  const windowRow = await db.select().from(settings).where(eq(settings.key, 'renewal_window_days'));
  const windowDays = parseInt(windowRow[0]?.value ?? '30');
  const windowDate = new Date();
  windowDate.setDate(windowDate.getDate() + windowDays);
  const windowDateStr = windowDate.toISOString().split('T')[0]!;

  const [
    clientCount,
    websiteCount,
    websiteStatusCounts,
    maintStatusCounts,
    platformCounts,
    serviceTypeCounts,
    expiredRows,
    upcomingRows,
    transferRows,
    activityRows,
  ] = await Promise.all([
    db.select({ total: sql<number>`cast(count(*) as integer)` }).from(clients),
    db.select({ total: sql<number>`cast(count(*) as integer)` }).from(websites),

    db
      .select({ status: websites.websiteStatus, cnt: sql<number>`cast(count(*) as integer)` })
      .from(websites)
      .groupBy(websites.websiteStatus),

    db
      .select({ status: websites.maintenanceStatus, cnt: sql<number>`cast(count(*) as integer)` })
      .from(websites)
      .groupBy(websites.maintenanceStatus),

    db
      .select({ platform: websites.platform, cnt: sql<number>`cast(count(*) as integer)` })
      .from(websites)
      .groupBy(websites.platform),

    db
      .select({ serviceType: websites.serviceType, cnt: sql<number>`cast(count(*) as integer)` })
      .from(websites)
      .groupBy(websites.serviceType),

    // Expired: maintain, maintenance_status Expired
    db
      .select({
        websiteId: websites.websiteId,
        projectName: websites.projectName,
        renewalDate: websites.renewalDate,
        clientName: clients.name,
      })
      .from(websites)
      .innerJoin(clients, eq(clients.clientId, websites.clientId))
      .where(
        and(
          eq(websites.serviceType, 'maintain'),
          eq(websites.maintenanceStatus, 'Expired'),
        ),
      ),

    // Upcoming renewals: Active maintain, renewal within window
    db
      .select({
        websiteId: websites.websiteId,
        projectName: websites.projectName,
        renewalDate: websites.renewalDate,
        clientName: clients.name,
      })
      .from(websites)
      .innerJoin(clients, eq(clients.clientId, websites.clientId))
      .where(
        and(
          eq(websites.serviceType, 'maintain'),
          eq(websites.maintenanceStatus, 'Active'),
          gte(websites.renewalDate, today),
          lte(websites.renewalDate, windowDateStr),
        ),
      ),

    // Transfer pending: handover, transfer not completed
    db
      .select({
        websiteId: websites.websiteId,
        projectName: websites.projectName,
        handoverDate: websites.handoverDate,
        clientName: clients.name,
      })
      .from(websites)
      .innerJoin(clients, eq(clients.clientId, websites.clientId))
      .where(
        and(
          eq(websites.serviceType, 'handover'),
          eq(websites.transferCompleted, false),
        ),
      ),

    // Recent activity — last 20
    db
      .select({
        logId: activityLog.logId,
        description: activityLog.description,
        createdAt: activityLog.createdAt,
        userName: users.name,
      })
      .from(activityLog)
      .leftJoin(users, eq(users.userId, activityLog.userId))
      .orderBy(sql`${activityLog.createdAt} desc`)
      .limit(20),
  ]);

  const byWebsiteStatus: Record<string, number> = {};
  for (const r of websiteStatusCounts) byWebsiteStatus[r.status] = r.cnt;

  const byMaintenanceStatus: Record<string, number> = {};
  for (const r of maintStatusCounts) byMaintenanceStatus[r.status] = r.cnt;

  const byPlatform: Record<string, number> = {};
  for (const r of platformCounts) byPlatform[r.platform] = r.cnt;

  const byServiceType: Record<string, number> = {};
  for (const r of serviceTypeCounts) byServiceType[r.serviceType] = r.cnt;

  return {
    counts: {
      totalClients: clientCount[0]?.total ?? 0,
      totalWebsites: websiteCount[0]?.total ?? 0,
      byWebsiteStatus,
      byMaintenanceStatus,
      byPlatform,
      byServiceType,
    },
    expired: expiredRows.map((r) => {
      const renewal = r.renewalDate ?? today;
      const daysOverdue = Math.floor(
        (new Date(today).getTime() - new Date(renewal).getTime()) / 86400000,
      );
      return {
        websiteId: r.websiteId,
        projectName: r.projectName,
        clientName: r.clientName,
        renewalDate: renewal,
        daysOverdue: Math.max(0, daysOverdue),
      };
    }),
    upcomingRenewals: upcomingRows.map((r) => {
      const renewal = r.renewalDate ?? today;
      const daysLeft = Math.floor(
        (new Date(renewal).getTime() - new Date(today).getTime()) / 86400000,
      );
      return {
        websiteId: r.websiteId,
        projectName: r.projectName,
        clientName: r.clientName,
        renewalDate: renewal,
        daysLeft: Math.max(0, daysLeft),
      };
    }),
    transferPending: transferRows.map((r) => ({
      websiteId: r.websiteId,
      projectName: r.projectName,
      clientName: r.clientName,
      handoverDate: r.handoverDate ?? null,
    })),
    recentActivity: activityRows.map((r) => ({
      logId: r.logId,
      description: r.description,
      userName: r.userName ?? 'System',
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
