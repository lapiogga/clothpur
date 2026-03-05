"use server"

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  orders,
  orderItems,
  products,
  productSpecs,
  inventory,
  inventoryLog,
  pointSummary,
  pointLedger,
  tailoringTickets,
} from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
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

const onlineOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    specId: z.string().nullable().optional(),
    quantity: z.number().int().positive(),
  })).min(1, '주문 품목을 선택하세요'),
  storeId: z.string().min(1, '배송 판매소를 선택하세요'),
  deliveryAddress: z.string().optional(),
})

export async function createOnlineOrderAction(data: unknown) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'user') {
    return { success: false, error: '권한이 없습니다' }
  }

  const parsed = onlineOrderSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: '입력값 오류' }

  const { items, storeId, deliveryAddress } = parsed.data
  const userId = session.user.id!

  // 포인트 요약 조회
  const summary = db.select().from(pointSummary)
    .where(eq(pointSummary.userId, userId))
    .get()

  const available = summary
    ? summary.totalPoints - summary.usedPoints - summary.reservedPoints
    : 0

  // 품목/가격 조회 및 총액 계산
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
      return { success: false, error: `품목을 찾을 수 없습니다: ${item.productId}` }
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
    return { success: false, error: `포인트가 부족합니다. 필요: ${totalAmount.toLocaleString()}, 잔여: ${available.toLocaleString()}` }
  }

  // 완제품 재고 확인
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
        return { success: false, error: `재고가 부족합니다: ${item.productName}` }
      }
    }
  }

  const orderNumber = generateOrderNumber()

  const productType = enrichedItems.every(i => i.itemType === 'finished')
    ? 'finished'
    : enrichedItems.every(i => i.itemType === 'custom')
      ? 'custom'
      : 'finished' // 혼합 주문은 finished 처리

  try {
   db.transaction(() => {
    // 주문 생성
    db.insert(orders).values({
      orderNumber,
      userId,
      storeId,
      orderType: 'online',
      productType,
      status: 'pending',
      totalAmount,
      deliveryMethod: 'parcel',
      deliveryAddress: deliveryAddress ?? null,
    }).run()

    // 주문 조회 (ID 획득)
    const order = db.select().from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .get()!

    // 주문 상세 생성
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

      // 완제품 → 재고 예약 감소 (실제 출고는 배송 확인 시)
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
          reason: `온라인주문 ${orderNumber}`,
          referenceId: order.id,
        }).run()
      }
    }

    // 포인트 예약
    const newBalance = available - totalAmount
    if (summary) {
      db.update(pointSummary)
        .set({ reservedPoints: summary.reservedPoints + totalAmount })
        .where(eq(pointSummary.userId, userId))
        .run()
    } else {
      db.insert(pointSummary).values({
        userId,
        totalPoints: 0,
        usedPoints: 0,
        reservedPoints: totalAmount,
      }).run()
    }
    db.insert(pointLedger).values({
      userId,
      pointType: 'reserve',
      amount: totalAmount,
      balanceAfter: newBalance,
      description: `온라인주문 ${orderNumber}`,
      referenceType: 'order',
      referenceId: order.id,
    }).run()
  })
    revalidatePath('/my/orders')
    revalidatePath('/my/points')
    return { success: true, orderNumber }
  } catch {
    return { success: false, error: '주문 처리 중 오류가 발생했습니다' }
  }
}

export async function cancelOnlineOrderAction(orderId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'user') {
    return { success: false, error: '권한이 없습니다' }
  }

  const userId = session.user.id!
  const order = db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .get()

  if (!order) return { success: false, error: '주문을 찾을 수 없습니다' }
  if (order.status !== 'pending') return { success: false, error: '취소할 수 없는 상태입니다' }

  try {
    db.transaction(() => {
      db.update(orders)
        .set({ status: 'cancelled' })
        .where(eq(orders.id, orderId))
        .run()

      // 포인트 예약 해제
      const summary = db.select().from(pointSummary)
        .where(eq(pointSummary.userId, userId))
        .get()

      if (summary) {
        const available = summary.totalPoints - summary.usedPoints - summary.reservedPoints + order.totalAmount
        db.update(pointSummary)
          .set({ reservedPoints: Math.max(0, summary.reservedPoints - order.totalAmount) })
          .where(eq(pointSummary.userId, userId))
          .run()
        db.insert(pointLedger).values({
          userId,
          pointType: 'release',
          amount: order.totalAmount,
          balanceAfter: available,
          description: `주문취소 ${order.orderNumber}`,
          referenceType: 'order',
          referenceId: orderId,
        }).run()
      }
    })
    revalidatePath('/my/orders')
    revalidatePath('/my/points')
    return { success: true }
  } catch {
    return { success: false, error: '취소 처리 중 오류가 발생했습니다' }
  }
}
