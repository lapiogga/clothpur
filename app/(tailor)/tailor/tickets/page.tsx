import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tailoringTickets, users, products } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { TicketsClient } from './_components/tickets-client'

export default async function TailorTicketsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'tailor') redirect('/login')

  const tailorId = session.user.tailorId
  if (!tailorId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        체척업체가 배정되지 않은 계정입니다. 관리자에게 문의하세요.
      </div>
    )
  }

  // 이 체척업체에 등록된 체척권 + 발행된(미배정) 체척권 모두 표시
  const allTickets = db.select().from(tailoringTickets)
    .orderBy(desc(tailoringTickets.createdAt))
    .limit(200)
    .all()
    .filter(t => t.tailorId === tailorId || t.status === 'issued')

  const allUsers = db.select().from(users).all()
  const userMap = new Map(allUsers.map(u => [u.id, { name: u.name, rank: u.rank }]))

  const allProducts = db.select().from(products).all()
  const productMap = new Map(allProducts.map(p => [p.id, p.name]))

  const ticketRows = allTickets.map(t => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    userName: userMap.get(t.userId)?.name ?? '-',
    userRank: userMap.get(t.userId)?.rank ?? null,
    productName: productMap.get(t.productId) ?? '-',
    amount: t.amount,
    status: t.status,
    createdAt: t.createdAt,
    registeredAt: t.registeredAt ?? null,
  }))

  return <TicketsClient tickets={ticketRows} />
}
