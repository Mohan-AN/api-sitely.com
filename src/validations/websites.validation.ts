import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional().nullable();

export const createWebsiteSchema = z.object({
  clientId: z.string().min(1),
  projectName: z.string().min(1).max(150),
  url: z.string().url().optional().nullable(),
  siteType: z.enum(['static', 'wordpress']),
  platform: z.enum(['netlify', 'wpx']),
  serviceType: z.enum(['handover', 'maintain']),
  startDate: dateString,
  hostedDate: dateString,
  lastInvoiceSent: dateString,
  lastPaymentReceived: dateString,
  renewalDate: dateString,
  handoverDate: dateString,
  remarks: z.string().optional().nullable(),
});

export const updateWebsiteSchema = z.object({
  clientId: z.string().min(1).optional(),
  projectName: z.string().min(1).max(150).optional(),
  url: z.string().url().optional().nullable(),
  siteType: z.enum(['static', 'wordpress']).optional(),
  platform: z.enum(['netlify', 'wpx']).optional(),
  serviceType: z.enum(['handover', 'maintain']).optional(),
  websiteStatus: z.enum(['In Progress', 'Live', 'On Hold', 'Completed', 'Discontinued']).optional(),
  maintenanceStatus: z.enum(['Not Started', 'Active', 'Paused', 'Expired', 'Cancelled']).optional(),
  startDate: dateString,
  hostedDate: dateString,
  lastInvoiceSent: dateString,
  lastPaymentReceived: dateString,
  renewalDate: dateString,
  handoverDate: dateString,
  transferCompleted: z.boolean().optional(),
  remarks: z.string().optional().nullable(),
});

export const websiteListQuerySchema = z.object({
  clientId: z.string().optional(),
  websiteStatus: z.string().optional(),
  maintenanceStatus: z.string().optional(),
  serviceType: z.string().optional(),
  siteType: z.string().optional(),
  platform: z.string().optional(),
  transferPending: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
