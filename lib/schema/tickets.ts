import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { orderItems } from './orders'
import { users } from './users'
import { products } from './products'
import { tailors } from './stores'

// 체척권
export const tailoringTickets = sqliteTable('tailoring_tickets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  ticketNumber: text('ticket_number').notNull().unique(), // TKT-YYYYMMDD-NNNNN
  orderItemId: text('order_item_id').notNull().references(() => orderItems.id),
  userId: text('user_id').notNull().references(() => users.id),
  productId: text('product_id').notNull().references(() => products.id),
  amount: integer('amount').notNull(),
  status: text('status').notNull().default('issued'), // issued / registered / cancel_requested / cancelled
  tailorId: text('tailor_id').references(() => tailors.id),
  registeredAt: integer('registered_at'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()).$onUpdate(() => Date.now()),
}, (table) => [
  index('idx_tailoring_tickets_user_id').on(table.userId),
  index('idx_tailoring_tickets_tailor_id').on(table.tailorId),
  index('idx_tailoring_tickets_status').on(table.status),
])

// 체척업체정산
export const tailorSettlements = sqliteTable('tailor_settlements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tailorId: text('tailor_id').notNull().references(() => tailors.id),
  periodStart: text('period_start').notNull(), // YYYY-MM-DD
  periodEnd: text('period_end').notNull(), // YYYY-MM-DD
  ticketCount: integer('ticket_count').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  status: text('status').notNull().default('pending'), // pending / confirmed
  confirmedAt: integer('confirmed_at'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()).$onUpdate(() => Date.now()),
}, (table) => [
  index('idx_tailor_settlements_tailor_id').on(table.tailorId),
])
