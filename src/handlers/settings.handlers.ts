import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { settings } from '../db/schema';
import { successResponse } from '../types/common.types';
import { NotFoundException } from '../exceptions/http-exceptions';

export async function getSettingsHandler(c: any) {
  const db = getDb(c.env.DB_URL);
  const rows = await db.select().from(settings);
  const result = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return c.json(successResponse(result));
}

export async function updateSettingHandler(c: any) {
  const { value } = c.req.valid('json');
  const key = c.req.param('key');
  const db = getDb(c.env.DB_URL);

  const existing = await db.select().from(settings).where(eq(settings.key, key));
  if (!existing[0]) throw new NotFoundException(`Setting '${key}' not found`);

  await db.update(settings).set({ value }).where(eq(settings.key, key));
  return c.json(successResponse({ key, value }));
}
