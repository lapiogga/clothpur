import { sqliteTable, text, integer, index, AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

// 품목분류 (대/중/소 3단계 자기참조)
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  parentId: text('parent_id').references((): AnySQLiteColumn => categories.id),
  level: integer('level').notNull(), // 1:대, 2:중, 3:소
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index('idx_categories_parent_id').on(table.parentId),
])

// 품목
export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  productType: text('product_type').notNull(), // finished / custom
  price: integer('price').notNull(),
  imageUrl: text('image_url'),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()).$onUpdate(() => Date.now()),
}, (table) => [
  index('idx_products_category_id').on(table.categoryId),
  index('idx_products_product_type').on(table.productType),
  index('idx_products_is_active').on(table.isActive),
])

// 규격
export const productSpecs = sqliteTable('product_specs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id').notNull().references(() => products.id),
  specName: text('spec_name').notNull(), // 95, 100, 105 등
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index('idx_product_specs_product_id').on(table.productId),
])
