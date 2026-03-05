import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { products, productSpecs, categories, stores, pointSummary } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { ShopClient } from './_components/shop-client'

export default async function ShopPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = session.user.id!

  const summary = db.select().from(pointSummary)
    .where(eq(pointSummary.userId, userId))
    .get()

  const availablePoints = summary
    ? summary.totalPoints - summary.usedPoints - summary.reservedPoints
    : 0

  const allProducts = db.select().from(products)
    .where(eq(products.isActive, true))
    .all()

  const allSpecs = db.select().from(productSpecs)
    .where(eq(productSpecs.isActive, true))
    .all()

  const allCategories = db.select().from(categories).all()
  const categoryMap = new Map(allCategories.map(c => [c.id, c.name]))

  const activeStores = db.select({ id: stores.id, name: stores.name })
    .from(stores)
    .where(eq(stores.isActive, true))
    .all()

  const productList = allProducts
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    .map(p => ({
      id: p.id,
      name: p.name,
      categoryName: categoryMap.get(p.categoryId) ?? '',
      productType: p.productType as 'finished' | 'custom',
      price: p.price,
      specs: allSpecs
        .filter(s => s.productId === p.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(s => ({ id: s.id, specName: s.specName })),
    }))

  return (
    <ShopClient
      products={productList}
      stores={activeStores}
      availablePoints={availablePoints}
    />
  )
}
