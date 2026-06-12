import { getDb } from '../db/client';
import { listWebsites, createWebsite, getWebsite, updateWebsite } from '../services/websites.service';
import { successResponse } from '../types/common.types';
import { UNKNOWN_ERROR, WEBSITE_NOT_FOUND } from '../constants/app-messages';
import { ConflictException, NotFoundException } from '../exceptions/http-exceptions';

export async function listWebsitesHandler(c: any) {
  const q = c.req.valid('query');
  const db = getDb(c.env.DB_URL);
  const result = await listWebsites(db, q);
  return c.json(successResponse(result));
}

export async function createWebsiteHandler(c: any) {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB_URL);
  const result = await createWebsite(db, c.get('userId'), input);
  if ('error' in result) throw new NotFoundException(result.error ?? UNKNOWN_ERROR);
  return c.json(successResponse(result.data), 201);
}

export async function getWebsiteHandler(c: any) {
  const db = getDb(c.env.DB_URL);
  const website = await getWebsite(db, c.req.param('id'));
  if (!website) throw new NotFoundException(WEBSITE_NOT_FOUND);
  return c.json(successResponse(website));
}

export async function updateWebsiteHandler(c: any) {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB_URL);
  const result = await updateWebsite(db, c.get('userId'), c.req.param('id'), input);
  if ('error' in result) {
    if (result.error === WEBSITE_NOT_FOUND) throw new NotFoundException(result.error);
    throw new ConflictException(result.error ?? UNKNOWN_ERROR);
  }
  return c.json(successResponse(result.data));
}
