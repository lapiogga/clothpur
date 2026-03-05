"use server"

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, pointSummary, pointLedger } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ANNUAL_POINTS } from '@/lib/constants'
import type { Rank } from '@/types'

// 단일 사용자 포인트 지급
const grantSchema = z.object({
  userId: z.string().min(1, '사용자를 선택하세요'),
  amount: z.number().int().positive('금액은 0보다 커야 합니다'),
  description: z.string().min(1, '설명을 입력하세요'),
  fiscalYear: z.number().int().optional(),
  referenceType: z.string().optional(),
})

export async function grantPointAction(data: unknown) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return { success: false, error: '권한 없음' }
  const parsed = grantSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }

  const { userId, amount, description, fiscalYear, referenceType } = parsed.data

  try {
    db.transaction(() => {
      const summary = db.select().from(pointSummary)
        .where(eq(pointSummary.userId, userId))
        .get()

      const currentBalance = summary
        ? summary.totalPoints - summary.usedPoints - summary.reservedPoints
        : 0
      const newBalance = currentBalance + amount

      if (summary) {
        db.update(pointSummary)
          .set({ totalPoints: summary.totalPoints + amount })
          .where(eq(pointSummary.userId, userId))
          .run()
      } else {
        db.insert(pointSummary).values({
          userId,
          totalPoints: amount,
          usedPoints: 0,
          reservedPoints: 0,
        }).run()
      }

      db.insert(pointLedger).values({
        userId,
        pointType: 'grant',
        amount,
        balanceAfter: newBalance,
        description,
        referenceType: referenceType ?? 'manual',
        fiscalYear: fiscalYear ?? new Date().getFullYear(),
      }).run()
    })
    revalidatePath('/admin/points')
    return { success: true }
  } catch {
    return { success: false, error: '포인트 지급 중 오류가 발생했습니다' }
  }
}

// 일괄 연간 지급 (계급별 자동 계산)
const bulkGrantSchema = z.object({
  fiscalYear: z.number().int().min(2020).max(2100),
  targetUserIds: z.array(z.string()).optional(),
})

export async function bulkGrantAnnualPointsAction(data: unknown) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return { success: false, error: '권한 없음' }
  const parsed = bulkGrantSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }

  const { fiscalYear, targetUserIds } = parsed.data

  let allUsers = db.select().from(users)
    .where(eq(users.role, 'user'))
    .all()

  if (targetUserIds?.length) {
    allUsers = allUsers.filter(u => targetUserIds.includes(u.id))
  }

  const activeUsers = allUsers.filter(u => u.isActive && u.rank)

  // 해당 연도 연간 지급 이력 확인
  const alreadyGranted = db.select({ userId: pointLedger.userId })
    .from(pointLedger)
    .where(and(
      eq(pointLedger.pointType, 'grant'),
      eq(pointLedger.fiscalYear, fiscalYear),
      eq(pointLedger.referenceType, 'annual'),
    ))
    .all()
    .map(r => r.userId)

  const toGrant = activeUsers.filter(u => !alreadyGranted.includes(u.id))

  if (toGrant.length === 0) {
    return { success: false, error: '지급 대상이 없거나 이미 모두 지급되었습니다' }
  }

  try {
    db.transaction(() => {
      for (const user of toGrant) {
        const amount = ANNUAL_POINTS[user.rank as Rank]
        if (!amount) continue

        const summary = db.select().from(pointSummary)
          .where(eq(pointSummary.userId, user.id))
          .get()

        const currentBalance = summary
          ? summary.totalPoints - summary.usedPoints - summary.reservedPoints
          : 0
        const newBalance = currentBalance + amount

        if (summary) {
          db.update(pointSummary)
            .set({ totalPoints: summary.totalPoints + amount })
            .where(eq(pointSummary.userId, user.id))
            .run()
        } else {
          db.insert(pointSummary).values({
            userId: user.id,
            totalPoints: amount,
            usedPoints: 0,
            reservedPoints: 0,
          }).run()
        }

        db.insert(pointLedger).values({
          userId: user.id,
          pointType: 'grant',
          amount,
          balanceAfter: newBalance,
          description: `${fiscalYear}년도 연간 피복포인트 지급`,
          referenceType: 'annual',
          fiscalYear,
        }).run()
      }
    })
    revalidatePath('/admin/points')
    return { success: true, count: toGrant.length }
  } catch {
    return { success: false, error: '일괄 지급 중 오류가 발생했습니다' }
  }
}
