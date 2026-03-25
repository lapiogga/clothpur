"use server"

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { deliveryZones } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const zoneSchema = z.object({
  name: z.string().min(1, '배송지명을 입력하세요').max(100),
  address: z.string().optional(),
  note: z.string().optional(),
})

export async function createDeliveryZoneAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'store') {
    return { success: false, error: '권한이 없습니다' }
  }
  const storeId = session.user.storeId
  if (!storeId) return { success: false, error: '판매소 정보가 없습니다' }

  const parsed = zoneSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }

  db.insert(deliveryZones).values({
    storeId,
    name: parsed.data.name,
    address: parsed.data.address ?? null,
    note: parsed.data.note ?? null,
  }).run()

  revalidatePath('/store/delivery-zones')
  return { success: true }
}

export async function updateDeliveryZoneAction(id: string, data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'store') {
    return { success: false, error: '권한이 없습니다' }
  }
  const storeId = session.user.storeId
  if (!storeId) return { success: false, error: '판매소 정보가 없습니다' }

  const parsed = zoneSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }

  const zone = db.select().from(deliveryZones)
    .where(and(eq(deliveryZones.id, id), eq(deliveryZones.storeId, storeId)))
    .get()
  if (!zone) return { success: false, error: '배송지를 찾을 수 없습니다' }

  db.update(deliveryZones)
    .set({
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      note: parsed.data.note ?? null,
    })
    .where(eq(deliveryZones.id, id))
    .run()

  revalidatePath('/store/delivery-zones')
  return { success: true }
}

export async function toggleDeliveryZoneAction(id: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'store') {
    return { success: false, error: '권한이 없습니다' }
  }
  const storeId = session.user.storeId
  if (!storeId) return { success: false, error: '판매소 정보가 없습니다' }

  const zone = db.select().from(deliveryZones)
    .where(and(eq(deliveryZones.id, id), eq(deliveryZones.storeId, storeId)))
    .get()
  if (!zone) return { success: false, error: '배송지를 찾을 수 없습니다' }

  db.update(deliveryZones)
    .set({ isActive: !zone.isActive })
    .where(eq(deliveryZones.id, id))
    .run()

  revalidatePath('/store/delivery-zones')
  return { success: true }
}
