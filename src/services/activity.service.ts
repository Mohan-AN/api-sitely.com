import { Db } from '../db/client';
import { activityLog } from '../db/schema';
import { logger } from '../lib/logger';

interface LogActivityInput {
  db: Db;
  userId: string | null;
  action: 'create' | 'update' | 'status_change' | 'type_conversion';
  entityType: 'client' | 'website';
  entityId: string;
  description: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await input.db.insert(activityLog).values({
      userId: input.userId ?? undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to write activity log');
  }
}
