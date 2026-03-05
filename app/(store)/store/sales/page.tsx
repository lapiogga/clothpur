import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { products, productSpecs, inventory } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { SalesClient } from './_components/sales-client'

export default async function SalesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'store') redirect('/login')

  const storeId = session.user.storeId
  if (!storeId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        판매소가 배정되지 않은 계정입니다. 관리자에게 문의하세요.
      </div>
    )
  }

  const activeProducts = db.select().from(products)
    .where(eq(products.isActive, true))
    .all()
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const activeSpecs = db.select().from(productSpecs)
    .where(eq(productSpecs.isActive, true))
    .all()

  const storeInventory = db.select().from(inventory)
    .where(eq(inventory.storeId, storeId))
    .all()

  const inventoryBySpec: Record<string, number> = {}
  for (const i of storeInventory) {
    inventoryBySpec[`${i.productId}:${i.specId}`] = i.quantity
  }

  const productOptions = activeProducts.map(p => {
    const specs = activeSpecs
      .filter(s => s.productId === p.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(s => ({ id: s.id, specName: s.specName }))

    const availableQuantity: Record<string, number> = {}
    for (const s of specs) {
      availableQuantity[s.id] = inventoryBySpec[`${p.id}:${s.id}`] ?? 0
    }

    return {
      id: p.id,
      name: p.name,
      price: p.price,
      productType: p.productType as 'finished' | 'custom',
      specs,
      availableQuantity,
    }
  })

  return <SalesClient products={productOptions} />
}
