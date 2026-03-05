import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pointSummary, orders, tailoringTickets } from '@/lib/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function UserDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = session.user.id!

  const summary = db.select().from(pointSummary)
    .where(eq(pointSummary.userId, userId))
    .get()
  const available = summary
    ? summary.totalPoints - summary.usedPoints - summary.reservedPoints
    : 0

  const activeOrderCount = db.select().from(orders)
    .where(and(
      eq(orders.userId, userId),
      inArray(orders.status, ['pending', 'confirmed', 'shipping']),
    ))
    .all().length

  const issuedTicketCount = db.select().from(tailoringTickets)
    .where(and(
      eq(tailoringTickets.userId, userId),
      eq(tailoringTickets.status, 'issued'),
    ))
    .all().length

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">내 피복 현황</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/my/points">
          <Card className="rounded-[4px] hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">잔여 포인트</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums text-[#1a3a5c]">
                {available.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/my/orders">
          <Card className="rounded-[4px] hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">진행중 주문</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{activeOrderCount}</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="rounded-[4px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">미등록 체척권</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{issuedTicketCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
