import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { inventory, products, productSpecs, stores } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { InventoryClient } from './_components/inventory-client'

export default async function InventoryPage() {
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

  const store = db.select().from(stores).where(eq(stores.id, storeId)).get()

  const storeInventory = db.select().from(inventory)
    .where(eq(inventory.storeId, storeId))
    .all()

  const allProducts = db.select().from(products).where(eq(products.isActive, true)).all()
  const allSpecs = db.select().from(productSpecs).where(eq(productSpecs.isActive, true)).all()

  const productMap = new Map(allProducts.map(p => [p.id, p.name]))
  const specMap = new Map(allSpecs.map(s => [s.id, s.specName]))

  const inventoryRows = storeInventory
    .map(inv => ({
      id: inv.id,
      productId: inv.productId,
      productName: productMap.get(inv.productId) ?? inv.productId,
      specId: inv.specId,
      specName: specMap.get(inv.specId) ?? inv.specId,
      quantity: inv.quantity,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName, 'ko'))

  const productOptions = allProducts
    .filter(p => p.productType === 'finished')
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    .map(p => ({
      id: p.id,
      name: p.name,
      specs: allSpecs
        .filter(s => s.productId === p.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(s => ({ id: s.id, specName: s.specName })),
    }))

  return (
    <InventoryClient
      storeId={storeId}
      storeName={store?.name ?? storeId}
      inventory={inventoryRows}
      products={productOptions}
    />
  )
}
