import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { stores } from './stores'
import { products, productSpecs } from './products'

// 재고
export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text('store_id').notNull().references(() => stores.id),
  productId: text('product_id').notNull().references(() => products.id),
  specId: text('spec_id').notNull().references(() => productSpecs.id),
  quantity: integer('quantity').notNull().default(0),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()).$onUpdate(() => Date.now()),
}, (table) => [
  index('idx_inventory_store_id').on(table.storeId),
  index('idx_inventory_product_spec').on(table.productId, table.specId),
  uniqueIndex('uq_inventory_store_product_spec').on(table.storeId, table.productId, table.specId),
])

// 재고변동이력
export const inventoryLog = sqliteTable('inventory_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  inventoryId: text('inventory_id').notNull().references(() => inventory.id),
  changeType: text('change_type').notNull(), // incoming / sale / return / adjust_up / adjust_down
  quantity: integer('quantity').notNull(),
  reason: text('reason'),
  referenceId: text('reference_id'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index('idx_inventory_log_inventory_id').on(table.inventoryId),
])
