import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orders, orderItems, products, users, stores } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const STATUS_LABELS: Record<string, string> = {
  pending: '접수',
  confirmed: '확인',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
  returned: '반품',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'default',
  confirmed: 'secondary',
  shipping: 'default',
  delivered: 'secondary',
  cancelled: 'destructive',
  returned: 'outline',
}

function formatPoints(n: number) {
  return n.toLocaleString('ko-KR')
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR')
}

export default async function StoreOrdersPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'store') redirect('/login')

  const storeId = session.user.storeId
  if (!storeId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        판매소가 배정되지 않은 계정입니다.
      </div>
    )
  }

  const storeOrders = db.select().from(orders)
    .where(eq(orders.storeId, storeId))
    .orderBy(desc(orders.createdAt))
    .limit(100)
    .all()

  const allUsers = db.select().from(users).all()
  const userMap = new Map(allUsers.map(u => [u.id, u.name]))

  const allItems = db.select().from(orderItems).all()
  const allProducts = db.select().from(products).all()
  const productMap = new Map(allProducts.map(p => [p.id, p.name]))

  const rows = storeOrders.map(o => {
    const items = allItems.filter(i => i.orderId === o.id)
    const names = items.map(i => productMap.get(i.productId) ?? '').filter(Boolean)
    const itemSummary = names.length === 0 ? '-'
      : names.length === 1 ? names[0]
      : `${names[0]} 외 ${names.length - 1}건`

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      userName: userMap.get(o.userId) ?? '-',
      itemSummary,
    }
  })

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">주문 현황</h2>
      <div className="border rounded-[4px] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>주문번호</TableHead>
              <TableHead className="w-[80px]">유형</TableHead>
              <TableHead className="w-[80px]">고객</TableHead>
              <TableHead>품목</TableHead>
              <TableHead className="w-[100px] text-right">금액</TableHead>
              <TableHead className="w-[80px]">상태</TableHead>
              <TableHead className="w-[100px]">주문일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  주문 내역이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.orderNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-[2px] text-xs">
                      {row.orderType === 'online' ? '온라인' : '오프라인'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{row.userName}</TableCell>
                  <TableCell className="text-sm">{row.itemSummary}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPoints(row.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_VARIANT[row.status] ?? 'secondary'}
                      className="rounded-[2px]"
                    >
                      {STATUS_LABELS[row.status] ?? row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(row.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
