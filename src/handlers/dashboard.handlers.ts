import { getDb } from '../db/client';
import { getDashboard } from '../services/dashboard.service';
import { successResponse } from '../types/common.types';

export async function getDashboardHandler(c: any) {
  const db = getDb(c.env.DB_URL);
  const data = await getDashboard(db);
  return c.json(successResponse(data));
}
