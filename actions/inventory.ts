"use server"

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { inventory, inventoryLog, products, productSpecs, stores } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const incomingSchema = z.object({
  storeId: z.string().min(1),
  productId: z.string().min(1),
  specId: z.string().min(1),
  quantity: z.number().int().positive('수량은 1 이상이어야 합니다'),
  reason: z.string().optional(),
})

export async function incomingInventoryAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'store') {
    return { success: false, error: '권한이 없습니다' }
  }

  const parsed = incomingSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }

  const { storeId, productId, specId, quantity, reason } = parsed.data

  // 판매소 담당자 권한 확인
  if (session.user.storeId !== storeId) {
    return { success: false, error: '해당 판매소 권한이 없습니다' }
  }

  try {
    db.transaction(() => {
      const existing = db.select().from(inventory)
        .where(and(
          eq(inventory.storeId, storeId),
          eq(inventory.productId, productId),
          eq(inventory.specId, specId),
        ))
        .get()

      if (existing) {
        db.update(inventory)
          .set({ quantity: existing.quantity + quantity })
          .where(eq(inventory.id, existing.id))
          .run()
        db.insert(inventoryLog).values({
          inventoryId: existing.id,
          changeType: 'incoming',
          quantity,
          reason: reason ?? '입고',
        }).run()
      } else {
        db.insert(inventory).values({
          storeId,
          productId,
          specId,
          quantity,
        }).run()
        const created = db.select().from(inventory)
          .where(and(
            eq(inventory.storeId, storeId),
            eq(inventory.productId, productId),
            eq(inventory.specId, specId),
          ))
          .get()!
        db.insert(inventoryLog).values({
          inventoryId: created.id,
          changeType: 'incoming',
          quantity,
          reason: reason ?? '입고',
        }).run()
      }
    })
    revalidatePath('/store/inventory')
    return { success: true }
  } catch {
    return { success: false, error: '입고 처리 중 오류가 발생했습니다' }
  }
}

const adjustSchema = z.object({
  inventoryId: z.string().min(1),
  newQuantity: z.number().int().min(0, '수량은 0 이상이어야 합니다'),
  reason: z.string().min(1, '조정 사유를 입력하세요'),
})

export async function adjustInventoryAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'store') {
    return { success: false, error: '권한이 없습니다' }
  }

  const parsed = adjustSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }

  const { inventoryId, newQuantity, reason } = parsed.data

  const inv = db.select().from(inventory)
    .where(eq(inventory.id, inventoryId))
    .get()
  if (!inv) return { success: false, error: '재고를 찾을 수 없습니다' }

  if (session.user.storeId !== inv.storeId) {
    return { success: false, error: '해당 판매소 권한이 없습니다' }
  }

  const diff = newQuantity - inv.quantity
  const changeType = diff >= 0 ? 'adjust_up' : 'adjust_down'

  try {
    db.transaction(() => {
      db.update(inventory)
        .set({ quantity: newQuantity })
        .where(eq(inventory.id, inventoryId))
        .run()
      db.insert(inventoryLog).values({
        inventoryId,
        changeType,
        quantity: Math.abs(diff),
        reason,
      }).run()
    })
    revalidatePath('/store/inventory')
    return { success: true }
  } catch {
    return { success: false, error: '재고 조정 중 오류가 발생했습니다' }
  }
}
