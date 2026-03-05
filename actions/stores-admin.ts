"use server"

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stores } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const storeSchema = z.object({
  name: z.string().min(1, '판매소명은 필수입니다'),
  address: z.string().optional(),
  phone: z.string().optional(),
  managerName: z.string().optional(),
})

export async function createStoreAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다' }
  }

  const parsed = storeSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값이 올바르지 않습니다' }

  try {
    db.insert(stores).values({
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      managerName: parsed.data.managerName || null,
    }).run()
    revalidatePath('/admin/stores')
    return { success: true }
  } catch {
    return { success: false, error: '판매소 등록에 실패했습니다' }
  }
}

const updateStoreSchema = storeSchema.extend({
  id: z.string(),
})

export async function updateStoreAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다' }
  }

  const parsed = updateStoreSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값이 올바르지 않습니다' }

  const { id, ...rest } = parsed.data

  db.update(stores).set({
    name: rest.name,
    address: rest.address || null,
    phone: rest.phone || null,
    managerName: rest.managerName || null,
  }).where(eq(stores.id, id)).run()

  revalidatePath('/admin/stores')
  return { success: true }
}

export async function toggleStoreActiveAction(id: string, isActive: boolean) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다' }
  }

  db.update(stores).set({ isActive }).where(eq(stores.id, id)).run()
  revalidatePath('/admin/stores')
  return { success: true }
}
