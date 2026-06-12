import { getDb } from '../db/client';
import { listClients, createClient, getClient, updateClient } from '../services/clients.service';
import { successResponse } from '../types/common.types';
import { CLIENT_NOT_FOUND } from '../constants/app-messages';
import { NotFoundException } from '../exceptions/http-exceptions';

export async function listClientsHandler(c: any) {
  const { search, page, limit } = c.req.valid('query');
  const db = getDb(c.env.DB_URL);
  const result = await listClients(db, search, page, limit);
  return c.json(successResponse(result));
}

export async function createClientHandler(c: any) {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB_URL);
  const client = await createClient(db, c.get('userId'), input);
  return c.json(successResponse(client), 201);
}

export async function getClientHandler(c: any) {
  const db = getDb(c.env.DB_URL);
  const client = await getClient(db, c.req.param('id'));
  if (!client) throw new NotFoundException(CLIENT_NOT_FOUND);
  return c.json(successResponse(client));
}

export async function updateClientHandler(c: any) {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB_URL);
  const updated = await updateClient(db, c.get('userId'), c.req.param('id'), input);
  if (!updated) throw new NotFoundException(CLIENT_NOT_FOUND);
  return c.json(successResponse(updated));
}
