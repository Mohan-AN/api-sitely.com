import { getDb } from '../db/client';
import { runDailyExpiryCheck } from '../services/expiry.service';
import { logger } from '../lib/logger';

export async function handleDailyExpiry(env: { DB_URL: string }): Promise<void> {
  const db = getDb(env.DB_URL);
  try {
    const count = await runDailyExpiryCheck(db);
    logger.info({ count }, 'Daily expiry cron finished');
  } catch (err) {
    logger.error({ err }, 'Daily expiry cron failed');
  }
}
