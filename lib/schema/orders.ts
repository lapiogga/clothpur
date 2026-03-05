import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { users } from './users'
import { stores, deliveryZones } from './stores'
import { products, productSpecs } from './products'

// 주문
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderNumber: text('order_number').notNull().unique(), // ORD-YYYYMMDD-NNNNN
  userId: text('user_id').notNull().references(() => users.id),
  storeId: text('store_id').references(() => stores.id),
  orderType: text('order_type').notNull(), // online / offline
  productType: text('product_type').notNull(), // finished / custom
  status: text('status').notNull().default('pending'), // pending / confirmed / shipping / delivered / cancelled / returned
  totalAmount: integer('total_amount').notNull(),
  deliveryMethod: text('delivery_method'), // parcel / direct
  deliveryZoneId: text('delivery_zone_id').references(() => deliveryZones.id),
  deliveryAddress: text('delivery_address'),
  cancelReason: text('cancel_reason'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()).$onUpdate(() => Date.now()),
}, (table) => [
  index('idx_orders_user_id').on(table.userId),
  index('idx_orders_store_id').on(table.storeId),
  index('idx_orders_status').on(table.status),
  index('idx_orders_order_type').on(table.orderType),
  index('idx_orders_created_at').on(table.createdAt),
])

// 주문상세
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text('order_id').notNull().references(() => orders.id),
  productId: text('product_id').notNull().references(() => products.id),
  specId: text('spec_id').references(() => productSpecs.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
  subtotal: integer('subtotal').notNull(),
  itemType: text('item_type').notNull(), // finished / custom
  status: text('status').notNull().default('ordered'), // ordered / returned
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index('idx_order_items_order_id').on(table.orderId),
  index('idx_order_items_product_id').on(table.productId),
])
