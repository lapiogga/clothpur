"use server"

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  orders,
  orderItems,
  products,
  inventory,
  inventoryLog,
  pointSummary,
  pointLedger,
  tailoringTickets,
  users,
} from '@/lib/schema'
import { eq, and, like, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

function generateOrderNumber(): string {
  const d = new Date()
  const date = d.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
  return `ORD-${date}-${rand}`
}

function generateTicketNumber(): string {
  const d = new Date()
  const date = d.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
  return `TKT-${date}-${rand}`
}

export async function searchUsersForSaleAction(query: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'store') {
    return { success: false as const, error: '권한이 없습니다' }
  }

  if (!query || query.trim().length < 1) {
    return { success: true as const, users: [] }
  }

  const q = `%${query.trim()}%`
  const found = db.select({
    id: users.id,
    name: users.name,
    rank: users.rank,
    unit: users.unit,
    militaryNumber: users.militaryNumber,
  })
    .from(users)
    .where(and(
      eq(users.role, 'user'),
      eq(users.isActive, true),
      or(like(users.name, q), like(users.militaryNumber, q)),
    ))
    .limit(10)
    .all()

  return { success: true as const, users: found }
}

const offlineOrderSchema = z.object({
  userId: z.string().min(1, '사용자를 선택하세요'),
  items: z.array(z.object({
    productId: z.string().min(1),
    specId: z.string().nullable().optional(),
    quantity: z.number().int().positive(),
  })).min(1, '품목을 추가하세요'),
})

export async function createOfflineOrderAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'store') {
    return { success: false, error: '권한이 없습니다' }
  }

  const storeId = session.user.storeId
  if (!storeId) return { success: false, error: '판매소 정보가 없습니다' }

  const parsed = offlineOrderSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }

  const { userId, items } = parsed.data

  // 사용자 포인트 확인
  const summary = db.select().from(pointSummary)
    .where(eq(pointSummary.userId, userId))
    .get()
  const available = summary
    ? summary.totalPoints - summary.usedPoints - summary.reservedPoints
    : 0

  // 품목 정보 조회
  let totalAmount = 0
  const enrichedItems: Array<{
    productId: string
    specId: string | null
    quantity: number
    unitPrice: number
    subtotal: number
    itemType: 'finished' | 'custom'
    productName: string
  }> = []

  for (const item of items) {
    const product = db.select().from(products)
      .where(eq(products.id, item.productId))
      .get()
    if (!product || !product.isActive) {
      return { success: false, error: `품목을 찾을 수 없습니다` }
    }
    const subtotal = product.price * item.quantity
    totalAmount += subtotal
    enrichedItems.push({
      productId: item.productId,
      specId: item.specId ?? null,
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal,
      itemType: product.productType as 'finished' | 'custom',
      productName: product.name,
    })
  }

  if (available < totalAmount) {
    return {
      success: false,
      error: `포인트 부족. 잔여: ${available.toLocaleString()}, 필요: ${totalAmount.toLocaleString()}`,
    }
  }

  // 재고 확인
  for (const item of enrichedItems) {
    if (item.itemType === 'finished' && item.specId) {
      const inv = db.select().from(inventory)
        .where(and(
          eq(inventory.storeId, storeId),
          eq(inventory.productId, item.productId),
          eq(inventory.specId, item.specId),
        ))
        .get()
      if (!inv || inv.quantity < item.quantity) {
        return { success: false, error: `재고 부족: ${item.productName}` }
      }
    }
  }

  const orderNumber = generateOrderNumber()
  const productType = enrichedItems.every(i => i.itemType === 'custom') ? 'custom' : 'finished'

  try {
   db.transaction(() => {
    db.insert(orders).values({
      orderNumber,
      userId,
      storeId,
      orderType: 'offline',
      productType,
      status: 'delivered', // 오프라인은 즉시 구매 완료
      totalAmount,
    }).run()

    const order = db.select().from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .get()!

    for (const item of enrichedItems) {
      db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        specId: item.specId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        itemType: item.itemType,
        status: 'ordered',
      }).run()

      const orderItem = db.select().from(orderItems)
        .where(and(
          eq(orderItems.orderId, order.id),
          eq(orderItems.productId, item.productId),
        ))
        .get()!

      // 맞춤 피복 → 체척권 발행
      if (item.itemType === 'custom') {
        db.insert(tailoringTickets).values({
          ticketNumber: generateTicketNumber(),
          orderItemId: orderItem.id,
          userId,
          productId: item.productId,
          amount: item.subtotal,
          status: 'issued',
        }).run()
      }

      // 완제품 → 재고 차감
      if (item.itemType === 'finished' && item.specId) {
        const inv = db.select().from(inventory)
          .where(and(
            eq(inventory.storeId, storeId),
            eq(inventory.productId, item.productId),
            eq(inventory.specId, item.specId),
          ))
          .get()!
        db.update(inventory)
          .set({ quantity: inv.quantity - item.quantity })
          .where(eq(inventory.id, inv.id))
          .run()
        db.insert(inventoryLog).values({
          inventoryId: inv.id,
          changeType: 'sale',
          quantity: -item.quantity,
          reason: `오프라인판매 ${orderNumber}`,
          referenceId: order.id,
        }).run()
      }
    }

    // 포인트 즉시 차감 (오프라인은 예약 없이 바로 차감)
    const newBalance = available - totalAmount
    if (summary) {
      db.update(pointSummary)
        .set({ usedPoints: summary.usedPoints + totalAmount })
        .where(eq(pointSummary.userId, userId))
        .run()
    } else {
      db.insert(pointSummary).values({
        userId,
        totalPoints: 0,
        usedPoints: totalAmount,
        reservedPoints: 0,
      }).run()
    }
    db.insert(pointLedger).values({
      userId,
      pointType: 'deduct',
      amount: totalAmount,
      balanceAfter: newBalance,
      description: `오프라인판매 ${orderNumber}`,
      referenceType: 'order',
      referenceId: order.id,
    }).run()
  })
    revalidatePath('/store/orders')
    revalidatePath('/store/inventory')
    return { success: true, orderNumber }
  } catch {
    return { success: false, error: '판매 처리 중 오류가 발생했습니다' }
  }
}
