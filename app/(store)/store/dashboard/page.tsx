import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orders, inventory } from '@/lib/schema'
import { eq, and, gte, inArray } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function StoreDashboardPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'store') redirect('/login')

  const storeId = session.user.storeId

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  let todaySaleCount = 0
  let pendingOrderCount = 0
  let lowStockCount = 0

  if (storeId) {
    todaySaleCount = db.select().from(orders)
      .where(and(
        eq(orders.storeId, storeId),
        gte(orders.createdAt, todayStart.getTime()),
      ))
      .all().length

    pendingOrderCount = db.select().from(orders)
      .where(and(
        eq(orders.storeId, storeId),
        inArray(orders.status, ['pending', 'confirmed']),
      ))
      .all().length

    lowStockCount = db.select().from(inventory)
      .where(and(
        eq(inventory.storeId, storeId),
        eq(inventory.quantity, 0),
      ))
      .all().length
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">판매소 대시보드</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-[4px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">금일 판매</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todaySaleCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[4px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">미처리 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingOrderCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[4px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">품절 품목</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : ''}`}>
              {lowStockCount}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
