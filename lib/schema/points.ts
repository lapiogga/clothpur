import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { users } from './users'

// 포인트요약
export const pointSummary = sqliteTable('point_summary', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id).unique(),
  totalPoints: integer('total_points').notNull().default(0),
  usedPoints: integer('used_points').notNull().default(0),
  reservedPoints: integer('reserved_points').notNull().default(0),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
})

// 포인트원장
export const pointLedger = sqliteTable('point_ledger', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  pointType: text('point_type').notNull(), // grant / deduct / add / return / reserve / release
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after'),
  description: text('description'),
  referenceType: text('reference_type'), // order / ticket / annual
  referenceId: text('reference_id'),
  fiscalYear: integer('fiscal_year'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index('idx_point_ledger_user_id').on(table.userId),
  index('idx_point_ledger_fiscal_year').on(table.fiscalYear),
  index('idx_point_ledger_created_at').on(table.createdAt),
])
