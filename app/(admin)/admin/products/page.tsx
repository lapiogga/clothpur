import { db } from '@/lib/db'
import { categories, products, productSpecs } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { ProductsClient } from './_components/products-client'

export default function ProductsPage() {
  const allCategories = db.select().from(categories).all()
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const allProducts = db.select().from(products).all()
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const allSpecs = db.select().from(productSpecs).all()
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1a3a5c]">품목 관리</h2>
        <a
          href="/admin/products/categories"
          className="text-sm text-[#1a3a5c] underline"
        >
          분류 관리
        </a>
      </div>
      <ProductsClient
        categories={allCategories}
        products={allProducts}
        specs={allSpecs}
      />
    </div>
  )
}
