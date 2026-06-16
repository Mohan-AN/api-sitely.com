import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const requiredString = (field: string, max?: number) => {
  let schema = z
    .string({
      required_error: `${field} is required`,
      invalid_type_error: `${field} is required`,
    })
    .min(1, `${field} is required`);

  if (max) schema = schema.max(max, `${field} must be at most ${max} characters`);

  return z.preprocess(emptyToUndefined, schema);
};

const requiredEnum = <T extends [string, ...string[]]>(field: string, values: T) =>
  z.preprocess(
    emptyToUndefined,
    z.enum(values, {
      required_error: `${field} is required`,
      invalid_type_error: `${field} is required`,
    }),
  );

const optionalDateString = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional().nullable(),
);

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().url('Invalid url').optional().nullable(),
);

export const createWebsiteSchema = z.object({
  clientId: requiredString('Client'),
  projectName: requiredString('Project name', 150),
  url: optionalUrl,
  siteType: requiredEnum('Site type', ['static', 'wordpress']),
  platform: requiredEnum('Platform', ['netlify', 'wpx']),
  startDate: optionalDateString,
  hostedDate: optionalDateString,
  lastInvoiceSent: optionalDateString,
  lastPaymentReceived: optionalDateString,
  renewalDate: optionalDateString,
  remarks: z.string().optional().nullable(),
});

export const updateWebsiteSchema = z.object({
  clientId: z.preprocess(emptyToUndefined, requiredString('Client').optional()),
  projectName: z.preprocess(emptyToUndefined, requiredString('Project name', 150).optional()),
  url: optionalUrl,
  siteType: z.enum(['static', 'wordpress']).optional(),
  platform: z.enum(['netlify', 'wpx']).optional(),
  websiteStatus: z.enum(['In Progress', 'Live', 'On Hold', 'Completed', 'Discontinued']).optional(),
  maintenanceStatus: z.enum(['Not Started', 'Active', 'Paused', 'Expired', 'Cancelled']).optional(),
  startDate: optionalDateString,
  hostedDate: optionalDateString,
  lastInvoiceSent: optionalDateString,
  lastPaymentReceived: optionalDateString,
  renewalDate: optionalDateString,
  remarks: z.string().optional().nullable(),
});

export const websiteListQuerySchema = z.object({
  clientId: z.string().optional(),
  websiteStatus: z.string().optional(),
  maintenanceStatus: z.string().optional(),
  siteType: z.string().optional(),
  platform: z.string().optional(),
  overdueOnly: z.coerce.boolean().optional(),
  sortBy: z.enum([
    'websiteId',
    'projectName',
    'clientName',
    'url',
    'siteType',
    'platform',
    'websiteStatus',
    'maintenanceStatus',
    'renewalDate',
    'createdAt',
    'updatedAt',
  ]).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
