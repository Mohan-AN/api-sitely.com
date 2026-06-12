import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  date,
  text,
  jsonb,
  uuid,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  userId: uuid('user_id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 10 }).notNull().default('admin'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    tokenId: uuid('token_id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId),
    refreshToken: text('refresh_token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex('refresh_tokens_token_idx').on(t.refreshToken),
    index('refresh_tokens_user_idx').on(t.userId),
  ],
);

export const clients = pgTable('clients', {
  clientId: varchar('client_id', { length: 10 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  company: varchar('company', { length: 150 }),
  phone: varchar('phone', { length: 15 }),
  email: varchar('email', { length: 150 }),
  city: varchar('city', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const websites = pgTable(
  'websites',
  {
    websiteId: varchar('website_id', { length: 10 }).primaryKey(),
    clientId: varchar('client_id', { length: 10 })
      .notNull()
      .references(() => clients.clientId),
    projectName: varchar('project_name', { length: 150 }).notNull(),
    url: varchar('url', { length: 255 }),
    siteType: varchar('site_type', { length: 20 }).notNull(),
    platform: varchar('platform', { length: 20 }).notNull(),
    serviceType: varchar('service_type', { length: 20 }).notNull(),
    websiteStatus: varchar('website_status', { length: 30 }).notNull().default('In Progress'),
    maintenanceStatus: varchar('maintenance_status', { length: 20 }).notNull().default('Not Started'),
    startDate: date('start_date'),
    hostedDate: date('hosted_date'),
    lastInvoiceSent: date('last_invoice_sent'),
    lastPaymentReceived: date('last_payment_received'),
    renewalDate: date('renewal_date'),
    handoverDate: date('handover_date'),
    transferCompleted: boolean('transfer_completed').notNull().default(false),
    serviceTypeChangedAt: date('service_type_changed_at'),
    remarks: text('remarks'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('idx_websites_client').on(t.clientId),
    index('idx_websites_renewal').on(t.renewalDate),
  ],
);

export const activityLog = pgTable(
  'activity_log',
  {
    logId: uuid('log_id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').references(() => users.userId),
    action: varchar('action', { length: 30 }).notNull(),
    entityType: varchar('entity_type', { length: 20 }).notNull(),
    entityId: varchar('entity_id', { length: 10 }).notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index('idx_log_recent').on(t.createdAt)],
);

export const settings = pgTable('settings', {
  key: varchar('key', { length: 50 }).primaryKey(),
  value: varchar('value', { length: 255 }).notNull(),
});
