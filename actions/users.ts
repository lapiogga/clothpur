"use server"

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { eq, and, like, or, sql, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, stores, tailors } from '@/lib/schema'

// 기본 비밀번호 (등록 시 자동 설정)
const DEFAULT_PASSWORD = 'password1234'

interface CreateUserInput {
  email: string
  name: string
  role: string
  rank?: string | null
  militaryNumber?: string | null
  unit?: string | null
  enlistDate?: string | null
  promotionDate?: string | null
  retirementDate?: string | null
  storeId?: string | null
  tailorId?: string | null
}

export async function createUser(input: CreateUserInput) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다.' }
  }

  // 이메일 중복 확인
  const existing = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .all()
  if (existing.length > 0) {
    return { success: false, error: '이미 사용 중인 이메일입니다.' }
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  db.insert(users)
    .values({
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      rank: input.rank ?? null,
      militaryNumber: input.militaryNumber ?? null,
      unit: input.unit ?? null,
      enlistDate: input.enlistDate ?? null,
      promotionDate: input.promotionDate ?? null,
      retirementDate: input.retirementDate ?? null,
      storeId: input.storeId ?? null,
      tailorId: input.tailorId ?? null,
    })
    .run()

  revalidatePath('/admin/users')
  return { success: true }
}

interface UpdateUserInput {
  id: string
  name: string
  rank?: string | null
  militaryNumber?: string | null
  unit?: string | null
  enlistDate?: string | null
  promotionDate?: string | null
  retirementDate?: string | null
  storeId?: string | null
  tailorId?: string | null
  isActive: boolean
}

export async function updateUser(input: UpdateUserInput) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다.' }
  }

  db.update(users)
    .set({
      name: input.name,
      rank: input.rank ?? null,
      militaryNumber: input.militaryNumber ?? null,
      unit: input.unit ?? null,
      enlistDate: input.enlistDate ?? null,
      promotionDate: input.promotionDate ?? null,
      retirementDate: input.retirementDate ?? null,
      storeId: input.storeId ?? null,
      tailorId: input.tailorId ?? null,
      isActive: input.isActive,
    })
    .where(eq(users.id, input.id))
    .run()

  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${input.id}`)
  return { success: true }
}

export async function resetPassword(userId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다.' }
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  db.update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId))
    .run()

  return { success: true }
}

interface GetUsersParams {
  role?: string
  rank?: string
  search?: string
  page?: number
  pageSize?: number
}

export async function getUsers(params: GetUsersParams = {}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { users: [], totalCount: 0 }
  }

  const { role, rank, search, page = 1, pageSize = 20 } = params
  const conditions = []

  if (role && role !== 'all') {
    conditions.push(eq(users.role, role))
  }
  if (rank && rank !== 'all') {
    conditions.push(eq(users.rank, rank))
  }
  if (search) {
    conditions.push(
      or(
        like(users.name, `%${search}%`),
        like(users.militaryNumber, `%${search}%`)
      )
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const totalResult = db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(whereClause)
    .all()
  const totalCount = totalResult[0]?.count ?? 0

  const offset = (page - 1) * pageSize
  const rows = db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all()

  // 소속 판매소/체척업체 이름 조회
  const storeMap: Record<string, string> = {}
  const tailorMap: Record<string, string> = {}

  const storeIds = [...new Set(rows.filter(u => u.storeId).map(u => u.storeId!))]
  const tailorIds = [...new Set(rows.filter(u => u.tailorId).map(u => u.tailorId!))]

  if (storeIds.length > 0) {
    for (const sid of storeIds) {
      const s = db.select({ id: stores.id, name: stores.name }).from(stores).where(eq(stores.id, sid)).all()
      if (s[0]) storeMap[s[0].id] = s[0].name
    }
  }
  if (tailorIds.length > 0) {
    for (const tid of tailorIds) {
      const t = db.select({ id: tailors.id, name: tailors.name }).from(tailors).where(eq(tailors.id, tid)).all()
      if (t[0]) tailorMap[t[0].id] = t[0].name
    }
  }

  const usersWithAffiliation = rows.map(u => ({
    ...u,
    storeName: u.storeId ? storeMap[u.storeId] ?? null : null,
    tailorName: u.tailorId ? tailorMap[u.tailorId] ?? null : null,
  }))

  return { users: usersWithAffiliation, totalCount }
}

export async function getUserById(id: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  const rows = db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .all()
  return rows[0] ?? null
}

// ---- 폼 기반 Server Actions (react-hook-form 연동) ----

import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['admin', 'store', 'tailor', 'user']),
  rank: z.string().optional(),
  militaryNumber: z.string().optional(),
  unit: z.string().optional(),
  enlistDate: z.string().optional(),
  storeId: z.string().optional(),
  tailorId: z.string().optional(),
})

export async function createUserAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다' }
  }

  const parsed = createUserSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값이 올바르지 않습니다' }

  const { password, ...rest } = parsed.data
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    db.insert(users).values({
      ...rest,
      passwordHash,
      storeId: rest.storeId || null,
      tailorId: rest.tailorId || null,
    }).run()
    revalidatePath('/admin/users')
    return { success: true }
  } catch {
    return { success: false, error: '이미 사용 중인 이메일입니다' }
  }
}

const updateUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
  name: z.string().min(1),
  role: z.enum(['admin', 'store', 'tailor', 'user']),
  rank: z.string().optional(),
  militaryNumber: z.string().optional(),
  unit: z.string().optional(),
  enlistDate: z.string().optional(),
  storeId: z.string().optional(),
  tailorId: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function updateUserAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다' }
  }

  const parsed = updateUserSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값이 올바르지 않습니다' }

  const { id, password, ...rest } = parsed.data
  const updateData: Partial<typeof users.$inferInsert> = {
    ...rest,
    storeId: rest.storeId || null,
    tailorId: rest.tailorId || null,
  }

  if (password && password.length > 0) {
    updateData.passwordHash = await bcrypt.hash(password, 10)
  }

  db.update(users).set(updateData).where(eq(users.id, id)).run()
  revalidatePath('/admin/users')
  return { success: true }
}

export async function toggleUserActiveAction(id: string, isActive: boolean) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: '권한이 없습니다' }
  }

  db.update(users).set({ isActive }).where(eq(users.id, id)).run()
  revalidatePath('/admin/users')
  return { success: true }
}
