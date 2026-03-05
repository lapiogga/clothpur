import { db } from '@/lib/db'
import { users, pointSummary } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { ANNUAL_POINTS } from '@/lib/constants'
import type { Rank } from '@/types'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function formatPoints(n: number) {
  return n.toLocaleString('ko-KR')
}

export default function PointsStatusPage() {
  const activeUsers = db.select().from(users)
    .where(eq(users.role, 'user'))
    .all()
    .filter(u => u.isActive)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const summaries = db.select().from(pointSummary).all()
  const summaryMap = new Map(summaries.map(s => [s.userId, s]))

  const rows = activeUsers.map(u => {
    const s = summaryMap.get(u.id)
    const total = s?.totalPoints ?? 0
    const used = s?.usedPoints ?? 0
    const reserved = s?.reservedPoints ?? 0
    const available = total - used - reserved
    const annualAlloc = u.rank ? (ANNUAL_POINTS[u.rank as Rank] ?? 0) : 0
    return { user: u, total, used, reserved, available, annualAlloc }
  })

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">포인트 현황</h2>
      <div className="border rounded-[4px] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead className="w-[90px]">계급</TableHead>
              <TableHead className="w-[80px]">소속부대</TableHead>
              <TableHead className="w-[120px] text-right">연간배정</TableHead>
              <TableHead className="w-[120px] text-right">총지급</TableHead>
              <TableHead className="w-[120px] text-right">사용</TableHead>
              <TableHead className="w-[120px] text-right">예약</TableHead>
              <TableHead className="w-[120px] text-right">잔여</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  등록된 사용자가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ user, total, used, reserved, available, annualAlloc }) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>
                    {user.rank ? (
                      <Badge variant="secondary" className="rounded-[2px]">
                        {user.rank}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{user.unit ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {annualAlloc > 0 ? formatPoints(annualAlloc) : '-'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatPoints(total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPoints(used)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPoints(reserved)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-[#1a3a5c]">
                    {formatPoints(available)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
