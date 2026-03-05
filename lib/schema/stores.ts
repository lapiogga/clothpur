import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

// 피복판매소
export const stores = sqliteTable('stores', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  managerName: text('manager_name'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()).$onUpdate(() => Date.now()),
}, (table) => [
  index('idx_stores_is_active').on(table.isActive),
])

// 체척업체
export const tailors = sqliteTable('tailors', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  businessNumber: text('business_number'),
  representative: text('representative'),
  address: text('address'),
  phone: text('phone'),
  bankName: text('bank_name'),
  accountNumber: text('account_number'),
  accountHolder: text('account_holder'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()).$onUpdate(() => Date.now()),
}, (table) => [
  index('idx_tailors_is_active').on(table.isActive),
])

// 배송지
export const deliveryZones = sqliteTable('delivery_zones', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  address: text('address'),
  note: text('note'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index('idx_delivery_zones_store_id').on(table.storeId),
])
