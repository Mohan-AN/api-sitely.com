import { and, eq, lt, isNull, or } from 'drizzle-orm';
import { Db } from '../db/client';
import { websites } from '../db/schema';
import { logActivity } from './activity.service';
import { logger } from '../lib/logger';

export async function runDailyExpiryCheck(db: Db): Promise<number> {
  const today = new Date().toISOString().split('T')[0]!;

  const due = await db
    .select({ websiteId: websites.websiteId, renewalDate: websites.renewalDate })
    .from(websites)
    .where(
      and(
        eq(websites.maintenanceStatus, 'Active'),
        lt(websites.renewalDate, today),
        or(
          isNull(websites.lastPaymentReceived),
          lt(websites.lastPaymentReceived, websites.renewalDate),
        ),
      ),
    );

  if (due.length === 0) return 0;

  for (const site of due) {
    await db
      .update(websites)
      .set({ maintenanceStatus: 'Expired', updatedAt: new Date() })
      .where(eq(websites.websiteId, site.websiteId));

    await logActivity({
      db,
      userId: null,
      action: 'status_change',
      entityType: 'website',
      entityId: site.websiteId,
      description: `${site.websiteId} maintenance expired — renewal was due ${site.renewalDate}`,
      oldValue: { maintenanceStatus: 'Active' },
      newValue: { maintenanceStatus: 'Expired' },
    });
  }

  logger.info({ count: due.length }, 'Daily expiry check complete');
  return due.length;
}
