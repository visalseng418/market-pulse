import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Enums
export const assetTypeEnum = pgEnum('asset_type', [
  'crypto',
  'forex',
  'commodity',
]);

export const alertConditionEnum = pgEnum('alert_condition', ['above', 'below']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Watchlist table
export const watchlists = pgTable('watchlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assetSymbol: varchar('asset_symbol', { length: 20 }).notNull(),
  assetType: assetTypeEnum('asset_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Price alerts table
export const priceAlerts = pgTable('price_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assetSymbol: varchar('asset_symbol', { length: 20 }).notNull(),
  assetType: assetTypeEnum('asset_type').notNull(),
  condition: alertConditionEnum('condition').notNull(),
  targetPrice: numeric('target_price', { precision: 20, scale: 8 }).notNull(),
  isTriggered: boolean('is_triggered').default(false).notNull(),
  triggeredAt: timestamp('triggered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Alert history table
export const alertHistory = pgTable('alert_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id')
    .notNull()
    .references(() => priceAlerts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assetSymbol: varchar('asset_symbol', { length: 20 }).notNull(),
  triggeredPrice: numeric('triggered_price', {
    precision: 20,
    scale: 8,
  }).notNull(),
  triggeredAt: timestamp('triggered_at').defaultNow().notNull(),
});

// Price snapshots table — stores historical price data
export const priceSnapshots = pgTable('price_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetSymbol: varchar('asset_symbol', { length: 20 }).notNull(),
  assetType: assetTypeEnum('asset_type').notNull(),
  price: numeric('price', { precision: 20, scale: 8 }).notNull(),
  volume: numeric('volume', { precision: 30, scale: 8 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
