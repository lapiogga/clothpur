"use server"

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { categories, products, productSpecs } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- 분류 ---
const categorySchema = z.object({
  name: z.string().min(1, '분류명을 입력하세요'),
  parentId: z.string().nullable().optional(),
  level: z.number().int().min(1).max(3),
  sortOrder: z.number().int().default(0),
})

export async function createCategoryAction(data: unknown) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return { success: false, error: '권한 없음' }
  const parsed = categorySchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }
  db.insert(categories).values({ ...parsed.data, parentId: parsed.data.parentId ?? null }).run()
  revalidatePath('/admin/products/categories')
  return { success: true }
}

export async function updateCategoryAction(id: string, data: unknown) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return { success: false, error: '권한 없음' }
  const parsed = categorySchema.partial().safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }
  db.update(categories).set(parsed.data).where(eq(categories.id, id)).run()
  revalidatePath('/admin/products/categories')
  return { success: true }
}

export async function toggleCategoryActiveAction(id: string, isActive: boolean) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return { success: false, error: '권한 없음' }
  db.update(categories).set({ isActive }).where(eq(categories.id, id)).run()
  revalidatePath('/admin/products/categories')
  return { success: true }
}

// --- 품목 ---
const productSchema = z.object({
  name: z.string().min(1, '품목명을 입력하세요'),
  categoryId: z.string().min(1, '분류를 선택하세요'),
  productType: z.enum(['finished', 'custom']),
  price: z.number().int().min(0),
  description: z.string().optional(),
})

export async function createProductAction(data: unknown) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return { success: false, error: '권한 없음' }
  const parsed = productSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }
  db.insert(products).values(parsed.data).run()
  revalidatePath('/admin/products')
  return { success: true }
}

export async function updateProductAction(id: string, data: unknown) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return { success: false, error: '권한 없음' }
  const parsed = productSchema.partial().safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }
  db.update(products).set(parsed.data).where(eq(products.id, id)).run()
  revalidatePath('/admin/products')
  return { success: true }
}

export async function toggleProductActiveAction(id: string, isActive: boolean) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return { success: false, error: '권한 없음' }
  db.update(products).set({ isActive }).where(eq(products.id, id)).run()
  revalidatePath('/admin/products')
  return { success: true }
}

// --- 규격 ---
const specSchema = z.object({
  productId: z.string().min(1),
  specName: z.string().min(1, '규격명을 입력하세요'),
  sortOrder: z.number().int().default(0),
})

export async function createSpecAction(data: unknown) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return { success: false, error: '권한 없음' }
  const parsed = specSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }
  db.insert(productSpecs).values(parsed.data).run()
  revalidatePath('/admin/products')
  return { success: true }
}

export async function deleteSpecAction(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return { success: false, error: '권한 없음' }
  db.delete(productSpecs).where(eq(productSpecs.id, id)).run()
  revalidatePath('/admin/products')
  return { success: true }
}
