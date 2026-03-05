"use server"

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tailors } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const tailorSchema = z.object({
  name: z.string().min(1, '업체명은 필수입니다'),
  businessNumber: z.string().optional(),
  representative: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
})

export async function createTailorAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다' }
  }

  const parsed = tailorSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값이 올바르지 않습니다' }

  try {
    db.insert(tailors).values({
      name: parsed.data.name,
      businessNumber: parsed.data.businessNumber || null,
      representative: parsed.data.representative || null,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      bankName: parsed.data.bankName || null,
      accountNumber: parsed.data.accountNumber || null,
      accountHolder: parsed.data.accountHolder || null,
    }).run()
    revalidatePath('/admin/tailors')
    return { success: true }
  } catch {
    return { success: false, error: '체척업체 등록에 실패했습니다' }
  }
}

const updateTailorSchema = tailorSchema.extend({
  id: z.string(),
})

export async function updateTailorAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다' }
  }

  const parsed = updateTailorSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값이 올바르지 않습니다' }

  const { id, ...rest } = parsed.data

  db.update(tailors).set({
    name: rest.name,
    businessNumber: rest.businessNumber || null,
    representative: rest.representative || null,
    address: rest.address || null,
    phone: rest.phone || null,
    bankName: rest.bankName || null,
    accountNumber: rest.accountNumber || null,
    accountHolder: rest.accountHolder || null,
  }).where(eq(tailors.id, id)).run()

  revalidatePath('/admin/tailors')
  return { success: true }
}

export async function toggleTailorActiveAction(id: string, isActive: boolean) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다' }
  }

  db.update(tailors).set({ isActive }).where(eq(tailors.id, id)).run()
  revalidatePath('/admin/tailors')
  return { success: true }
}
