import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pointSummary, pointLedger } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const POINT_TYPE_LABELS: Record<string, string> = {
  grant: '지급',
  deduct: '차감',
  add: '추가',
  return: '반환',
  reserve: '예약',
  release: '예약해제',
}

function formatPoints(n: number) {
  return n.toLocaleString('ko-KR')
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR')
}

export default async function MyPointsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const summary = db.select().from(pointSummary)
    .where(eq(pointSummary.userId, session.user.id!))
    .get()

  const ledger = db.select().from(pointLedger)
    .where(eq(pointLedger.userId, session.user.id!))
    .orderBy(desc(pointLedger.createdAt))
    .limit(50)
    .all()

  const total = summary?.totalPoints ?? 0
  const used = summary?.usedPoints ?? 0
  const reserved = summary?.reservedPoints ?? 0
  const available = total - used - reserved

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">내 포인트</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="rounded-[4px]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">잔여 포인트</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1a3a5c] tabular-nums">{formatPoints(available)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[4px]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">총 지급</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums">{formatPoints(total)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[4px]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">사용</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums">{formatPoints(used)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[4px]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">예약 중</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums">{formatPoints(reserved)}</p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mb-2">포인트 이력 (최근 50건)</h3>
      <div className="border rounded-[4px] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">날짜</TableHead>
              <TableHead className="w-[80px]">구분</TableHead>
              <TableHead className="text-right w-[120px]">금액</TableHead>
              <TableHead className="text-right w-[120px]">잔액</TableHead>
              <TableHead>설명</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  포인트 이력이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              ledger.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm">{formatDate(row.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-[2px]">
                      {POINT_TYPE_LABELS[row.pointType] ?? row.pointType}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${row.pointType === 'deduct' || row.pointType === 'reserve' ? 'text-red-600' : 'text-green-700'}`}>
                    {row.pointType === 'deduct' || row.pointType === 'reserve' ? '-' : '+'}{formatPoints(Math.abs(row.amount))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.balanceAfter !== null ? formatPoints(row.balanceAfter) : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{row.description ?? '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
