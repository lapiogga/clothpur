import { db } from '@/lib/db'
import { users, stores, orders } from '@/lib/schema'
import { eq, gte } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminDashboardPage() {
  // 오늘 시작 타임스탬프 (밀리초)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartMs = todayStart.getTime()

  const activeUserCount = db
    .select()
    .from(users)
    .where(eq(users.isActive, true))
    .all().length

  const todayOrderCount = db
    .select()
    .from(orders)
    .where(gte(orders.createdAt, todayStartMs))
    .all().length

  const activeStoreCount = db
    .select()
    .from(stores)
    .where(eq(stores.isActive, true))
    .all().length

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">관리자 대시보드</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-[4px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">전체 활성 사용자</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeUserCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[4px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">금일 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todayOrderCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[4px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">활성 판매소</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeStoreCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
