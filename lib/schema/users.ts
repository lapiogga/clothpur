import { sqliteTable, text, integer, index, uniqueIndex, AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { stores } from './stores'
import { tailors } from './stores'

// 사용자
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(), // admin / store / tailor / user
  rank: text('rank'), // 계급 (user만)
  militaryNumber: text('military_number'),
  unit: text('unit'),
  enlistDate: text('enlist_date'), // YYYY-MM-DD
  promotionDate: text('promotion_date'), // YYYY-MM-DD
  retirementDate: text('retirement_date'), // YYYY-MM-DD
  storeId: text('store_id').references(() => stores.id),
  tailorId: text('tailor_id').references(() => tailors.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()).$onUpdate(() => Date.now()),
}, (table) => [
  index('idx_users_role').on(table.role),
  index('idx_users_store_id').on(table.storeId),
  index('idx_users_tailor_id').on(table.tailorId),
  index('idx_users_is_active').on(table.isActive),
])

// 메뉴
export const menus = sqliteTable('menus', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  url: text('url'),
  parentId: text('parent_id').references((): AnySQLiteColumn => menus.id),
  sortOrder: integer('sort_order').notNull().default(0),
  roles: text('roles').notNull(), // JSON 문자열: ["admin","store"]
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index('idx_menus_parent_id').on(table.parentId),
])
