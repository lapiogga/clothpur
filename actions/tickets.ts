"use server"

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tailoringTickets, tailors, pointSummary, pointLedger, orders } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const registerSchema = z.object({
  ticketId: z.string().min(1),
})

export async function registerTicketAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'tailor') {
    return { success: false, error: '권한이 없습니다' }
  }

  const tailorId = session.user.tailorId
  if (!tailorId) return { success: false, error: '체척업체 정보가 없습니다' }

  const parsed = registerSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }

  const ticket = db.select().from(tailoringTickets)
    .where(eq(tailoringTickets.id, parsed.data.ticketId))
    .get()

  if (!ticket) return { success: false, error: '체척권을 찾을 수 없습니다' }
  if (ticket.status !== 'issued') return { success: false, error: '등록할 수 없는 상태입니다' }

  db.update(tailoringTickets)
    .set({
      status: 'registered',
      tailorId,
      registeredAt: Date.now(),
    })
    .where(eq(tailoringTickets.id, parsed.data.ticketId))
    .run()

  revalidatePath('/tailor/tickets')
  return { success: true }
}

const cancelRequestSchema = z.object({
  ticketId: z.string().min(1),
})

export async function requestCancelTicketAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'tailor') {
    return { success: false, error: '권한이 없습니다' }
  }

  const tailorId = session.user.tailorId
  if (!tailorId) return { success: false, error: '체척업체 정보가 없습니다' }

  const parsed = cancelRequestSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }

  const ticket = db.select().from(tailoringTickets)
    .where(and(
      eq(tailoringTickets.id, parsed.data.ticketId),
      eq(tailoringTickets.tailorId, tailorId),
    ))
    .get()

  if (!ticket) return { success: false, error: '체척권을 찾을 수 없습니다' }
  if (ticket.status !== 'registered') return { success: false, error: '취소 요청할 수 없는 상태입니다' }

  db.update(tailoringTickets)
    .set({ status: 'cancel_requested' })
    .where(eq(tailoringTickets.id, parsed.data.ticketId))
    .run()

  revalidatePath('/tailor/tickets')
  return { success: true }
}

// 군수담당자: 취소 승인
export async function approveCancelTicketAction(ticketId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다' }
  }

  const ticket = db.select().from(tailoringTickets)
    .where(eq(tailoringTickets.id, ticketId))
    .get()

  if (!ticket) return { success: false, error: '체척권을 찾을 수 없습니다' }
  if (ticket.status !== 'cancel_requested') return { success: false, error: '취소 승인할 수 없는 상태입니다' }

  try {
    db.transaction(() => {
      db.update(tailoringTickets)
        .set({ status: 'cancelled' })
        .where(eq(tailoringTickets.id, ticketId))
        .run()

      // 포인트 반환
      const summary = db.select().from(pointSummary)
        .where(eq(pointSummary.userId, ticket.userId))
        .get()
      if (summary) {
        const available = summary.totalPoints - summary.usedPoints - summary.reservedPoints + ticket.amount
        db.update(pointSummary)
          .set({ usedPoints: Math.max(0, summary.usedPoints - ticket.amount) })
          .where(eq(pointSummary.userId, ticket.userId))
          .run()
        db.insert(pointLedger).values({
          userId: ticket.userId,
          pointType: 'return',
          amount: ticket.amount,
          balanceAfter: available,
          description: `체척권취소 ${ticket.ticketNumber}`,
          referenceType: 'ticket',
          referenceId: ticket.id,
        }).run()
      }
    })
    revalidatePath('/admin/tickets')
    revalidatePath('/tailor/tickets')
    return { success: true }
  } catch {
    return { success: false, error: '취소 승인 중 오류가 발생했습니다' }
  }
}
