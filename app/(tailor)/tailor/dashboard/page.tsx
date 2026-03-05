import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tailoringTickets } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function TailorDashboardPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'tailor') redirect('/login')

  const tailorId = session.user.tailorId

  let registeredCount = 0
  let issuedCount = 0
  let cancelRequestedCount = 0

  if (tailorId) {
    registeredCount = db.select().from(tailoringTickets)
      .where(and(
        eq(tailoringTickets.tailorId, tailorId),
        eq(tailoringTickets.status, 'registered'),
      ))
      .all().length

    issuedCount = db.select().from(tailoringTickets)
      .where(eq(tailoringTickets.status, 'issued'))
      .all().length

    cancelRequestedCount = db.select().from(tailoringTickets)
      .where(and(
        eq(tailoringTickets.tailorId, tailorId),
        eq(tailoringTickets.status, 'cancel_requested'),
      ))
      .all().length
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">체척업체 대시보드</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-[4px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">등록 완료</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{registeredCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[4px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">미등록 (전체)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{issuedCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[4px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">취소 요청</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${cancelRequestedCount > 0 ? 'text-red-600' : ''}`}>
              {cancelRequestedCount}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
