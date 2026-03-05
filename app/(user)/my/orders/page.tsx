import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orders, orderItems, products, stores } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { OrdersClient } from './_components/orders-client'

export default async function MyOrdersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = session.user.id!

  const userOrders = db.select().from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .all()

  const allStores = db.select().from(stores).all()
  const storeMap = new Map(allStores.map(s => [s.id, s.name]))

  const allItems = db.select().from(orderItems).all()
  const allProducts = db.select().from(products).all()
  const productMap = new Map(allProducts.map(p => [p.id, p.name]))

  const orderRows = userOrders.map(o => {
    const items = allItems.filter(i => i.orderId === o.id)
    const names = items.map(i => productMap.get(i.productId) ?? '').filter(Boolean)
    const itemSummary = names.length > 0
      ? names.length === 1 ? names[0] : `${names[0]} 외 ${names.length - 1}건`
      : '-'

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      productType: o.productType,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      storeName: o.storeId ? (storeMap.get(o.storeId) ?? null) : null,
      itemSummary,
    }
  })

  return <OrdersClient orders={orderRows} />
}
