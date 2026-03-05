/**
 * Phase 6 테스트 데이터 생성 스크립트
 * - 판매소 5개
 * - 체척업체 3개
 * - 사용자 50명 (user role, 다양한 계급)
 * - store/tailor 계정 각 5개, 3개
 * - 품목분류 10개, 품목 20개, 규격 60개
 * - 재고 100건
 * - 포인트 지급 50건
 * - 주문 50건 (온라인 30 + 오프라인 20)
 * - 주문 상세 100건+
 * - 체척권 30건
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import bcrypt from 'bcryptjs'
import * as schema from '../lib/schema'
import { eq } from 'drizzle-orm'
import { ANNUAL_POINTS } from '../lib/constants'
import type { Rank } from '../types'

const sqlite = new Database('data/clothpur.db')
sqlite.pragma('foreign_keys = ON')
sqlite.pragma('journal_mode = WAL')
const db = drizzle(sqlite, { schema })

// ─── 유틸 ───
function uuid() { return crypto.randomUUID() }
function now() { return Date.now() }
function daysAgo(n: number) { return Date.now() - n * 86400000 }

function orderNum(date: Date, seq: number): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `ORD-${d}-${String(seq).padStart(5, '0')}`
}
function ticketNum(date: Date, seq: number): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `TKT-${d}-${String(seq).padStart(5, '0')}`
}

const RANKS: Rank[] = ['이병', '일병', '상병', '병장', '하사', '중사', '상사', '원사', '소위', '중위', '대위', '소령']
const UNITS = ['제1보병사단', '제2보병사단', '제3보병사단', '수도방위사령부', '해병대1사단', '특수전사령부', '육군훈련소', '제5군단']
const FIRST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전']
const LAST_NAMES = ['민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '지훈', '준서', '건우', '현우', '우진', '선우', '서진', '민재', '현준', '재원', '정우', '승우', '준혁', '지원', '동현', '성민', '재현', '승현', '민성', '진우', '태양', '재민', '수빈', '은지', '지수', '민지', '수아', '지은', '채원', '지아', '예은', '소연']

function randomName() {
  return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] +
    LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
}
function randomRank(): Rank { return RANKS[Math.floor(Math.random() * RANKS.length)] }
function randomUnit() { return UNITS[Math.floor(Math.random() * UNITS.length)] }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// ─── 메인 ───
async function seedTestData() {
  console.log('\n=== Phase 6 테스트 데이터 생성 시작 ===\n')
  const pw = await bcrypt.hash('password1234', 10)

  // ── 1. 판매소 5개 ──
  console.log('[1/9] 판매소 생성...')
  const storeNames = ['서울 피복판매소', '부산 피복판매소', '대구 피복판매소', '인천 피복판매소', '광주 피복판매소']
  const storeIds: string[] = []
  for (let i = 0; i < storeNames.length; i++) {
    const id = uuid()
    storeIds.push(id)
    db.insert(schema.stores).values({
      id,
      name: storeNames[i],
      address: `${storeNames[i].split(' ')[0]} 중구 피복로 ${(i + 1) * 10}`,
      phone: `0${2 + i}-${1000 + i * 111}-${2000 + i * 222}`,
      managerName: randomName(),
      isActive: true,
      createdAt: daysAgo(90),
    }).onConflictDoNothing().run()
  }
  console.log(`  → 판매소 ${storeIds.length}개 생성`)

  // ── 2. 체척업체 3개 ──
  console.log('[2/9] 체척업체 생성...')
  const tailorNames = ['한국피복주식회사', '대한군복제조', '전통피복공방']
  const tailorIds: string[] = []
  for (let i = 0; i < tailorNames.length; i++) {
    const id = uuid()
    tailorIds.push(id)
    db.insert(schema.tailors).values({
      id,
      name: tailorNames[i],
      businessNumber: `123-${45 + i}-${67890 + i}`,
      representative: randomName(),
      address: `서울 강남구 군복로 ${(i + 1) * 5}`,
      phone: `02-${3000 + i * 111}-${4000 + i * 222}`,
      bankName: pick(['국민은행', '신한은행', '하나은행']),
      accountNumber: `${100 + i}-${200 + i}-${300000 + i}`,
      accountHolder: tailorNames[i],
      isActive: true,
      createdAt: daysAgo(90),
    }).onConflictDoNothing().run()
  }
  console.log(`  → 체척업체 ${tailorIds.length}개 생성`)

  // ── 3. store/tailor 계정 ──
  console.log('[3/9] store/tailor 계정 생성...')
  const storeUserIds: string[] = []
  for (let i = 0; i < storeIds.length; i++) {
    const id = uuid()
    storeUserIds.push(id)
    db.insert(schema.users).values({
      id,
      email: `store${i + 1}@test.com`,
      passwordHash: pw,
      name: `판매소담당${i + 1}`,
      role: 'store',
      storeId: storeIds[i],
      isActive: true,
      createdAt: daysAgo(90),
    }).onConflictDoNothing().run()
  }
  // 기존 store@test.com 에 첫 번째 판매소 연결
  db.update(schema.users).set({ storeId: storeIds[0] }).where(eq(schema.users.email, 'store@test.com')).run()

  const tailorUserIds: string[] = []
  for (let i = 0; i < tailorIds.length; i++) {
    const id = uuid()
    tailorUserIds.push(id)
    db.insert(schema.users).values({
      id,
      email: `tailor${i + 1}@test.com`,
      passwordHash: pw,
      name: `체척담당${i + 1}`,
      role: 'tailor',
      tailorId: tailorIds[i],
      isActive: true,
      createdAt: daysAgo(90),
    }).onConflictDoNothing().run()
  }
  // 기존 tailor@test.com 에 첫 번째 체척업체 연결
  db.update(schema.users).set({ tailorId: tailorIds[0] }).where(eq(schema.users.email, 'tailor@test.com')).run()

  console.log(`  → store 계정 ${storeIds.length}개, tailor 계정 ${tailorIds.length}개 생성`)

  // ── 4. 일반사용자 50명 ──
  console.log('[4/9] 일반사용자 50명 생성...')
  const userIds: string[] = []
  for (let i = 0; i < 50; i++) {
    const id = uuid()
    userIds.push(id)
    const rank = randomRank()
    db.insert(schema.users).values({
      id,
      email: `soldier${i + 1}@army.mil`,
      passwordHash: pw,
      name: randomName(),
      role: 'user',
      rank,
      militaryNumber: `22-${75000000 + i}`,
      unit: randomUnit(),
      isActive: i < 48, // 2명 비활성
      createdAt: daysAgo(60 + i),
    }).onConflictDoNothing().run()
  }
  // 기존 user@test.com도 포함
  const existingUser = db.select().from(schema.users).where(eq(schema.users.email, 'user@test.com')).get()
  if (existingUser) userIds.unshift(existingUser.id)
  console.log(`  → 사용자 ${userIds.length}명 생성`)

  // ── 5. 품목 분류 + 품목 + 규격 ──
  console.log('[5/9] 품목 분류/품목/규격 생성...')

  // 대분류 3개
  const catTop = ['전투복', '근무복', '피장류']
  const topCatIds: string[] = []
  for (let i = 0; i < catTop.length; i++) {
    const id = uuid()
    topCatIds.push(id)
    db.insert(schema.categories).values({ id, name: catTop[i], level: 1, sortOrder: i + 1 }).onConflictDoNothing().run()
  }

  // 중분류
  const midCats = [
    { parent: 0, name: '상의' }, { parent: 0, name: '하의' }, { parent: 0, name: '방한복' },
    { parent: 1, name: '근무상의' }, { parent: 1, name: '근무하의' },
    { parent: 2, name: '방탄조끼' }, { parent: 2, name: '군화' }, { parent: 2, name: '배낭' },
  ]
  const midCatIds: string[] = []
  for (let i = 0; i < midCats.length; i++) {
    const id = uuid()
    midCatIds.push(id)
    db.insert(schema.categories).values({
      id, name: midCats[i].name, parentId: topCatIds[midCats[i].parent], level: 2, sortOrder: i + 1
    }).onConflictDoNothing().run()
  }

  // 품목 20개 (완제품 15 + 맞춤 5)
  const productDefs = [
    // 전투복 상의 (완제품)
    { name: '하계전투복 상의', catIdx: 0, type: 'finished', price: 35000, specs: ['90', '95', '100', '105', '110'] },
    { name: '동계전투복 상의', catIdx: 0, type: 'finished', price: 45000, specs: ['90', '95', '100', '105', '110'] },
    { name: '방탄복 조끼', catIdx: 0, type: 'finished', price: 120000, specs: ['S', 'M', 'L', 'XL'] },
    // 전투복 하의 (완제품)
    { name: '하계전투복 하의', catIdx: 1, type: 'finished', price: 30000, specs: ['28', '30', '32', '34', '36'] },
    { name: '동계전투복 하의', catIdx: 1, type: 'finished', price: 40000, specs: ['28', '30', '32', '34', '36'] },
    // 방한복
    { name: '방한복 상의', catIdx: 2, type: 'finished', price: 55000, specs: ['90', '95', '100', '105'] },
    { name: '방한복 하의', catIdx: 2, type: 'finished', price: 50000, specs: ['28', '30', '32', '34'] },
    // 근무복 (완제품)
    { name: '하계근무복 상의', catIdx: 3, type: 'finished', price: 40000, specs: ['90', '95', '100', '105', '110'] },
    { name: '동계근무복 상의', catIdx: 3, type: 'finished', price: 50000, specs: ['90', '95', '100', '105', '110'] },
    { name: '근무복 하의', catIdx: 4, type: 'finished', price: 35000, specs: ['28', '30', '32', '34', '36'] },
    // 피장류 (완제품)
    { name: '전투화', catIdx: 6, type: 'finished', price: 65000, specs: ['240', '250', '260', '270', '280', '290'] },
    { name: '단화', catIdx: 6, type: 'finished', price: 45000, specs: ['240', '250', '260', '270', '280'] },
    { name: '배낭 (60L)', catIdx: 7, type: 'finished', price: 80000, specs: ['표준'] },
    { name: '전투모', catIdx: 0, type: 'finished', price: 15000, specs: ['S', 'M', 'L'] },
    { name: '방탄모', catIdx: 5, type: 'finished', price: 200000, specs: ['S', 'M', 'L'] },
    // 맞춤 피복 (custom)
    { name: '정복 상의 (맞춤)', catIdx: 3, type: 'custom', price: 150000, specs: [] },
    { name: '정복 하의 (맞춤)', catIdx: 4, type: 'custom', price: 120000, specs: [] },
    { name: '의장복 (맞춤)', catIdx: 3, type: 'custom', price: 250000, specs: [] },
    { name: '동복 예복 (맞춤)', catIdx: 3, type: 'custom', price: 200000, specs: [] },
    { name: '하복 예복 (맞춤)', catIdx: 3, type: 'custom', price: 180000, specs: [] },
  ]

  const productIds: string[] = []
  const specsByProduct: Record<string, string[]> = {}

  for (const pd of productDefs) {
    const id = uuid()
    productIds.push(id)
    db.insert(schema.products).values({
      id,
      name: pd.name,
      categoryId: midCatIds[pd.catIdx],
      productType: pd.type,
      price: pd.price,
      isActive: true,
      createdAt: daysAgo(80),
    }).onConflictDoNothing().run()

    const specIds: string[] = []
    for (let si = 0; si < pd.specs.length; si++) {
      const specId = uuid()
      specIds.push(specId)
      db.insert(schema.productSpecs).values({
        id: specId,
        productId: id,
        specName: pd.specs[si],
        sortOrder: si + 1,
        isActive: true,
      }).onConflictDoNothing().run()
    }
    specsByProduct[id] = specIds
  }
  console.log(`  → 분류 ${topCatIds.length + midCatIds.length}개, 품목 ${productIds.length}개, 규격 ${Object.values(specsByProduct).flat().length}개`)

  // ── 6. 재고 (판매소별 완제품) ──
  console.log('[6/9] 재고 생성...')
  const finishedProductIds = productIds.slice(0, 15) // 완제품 15개
  let invCount = 0
  for (const storeId of storeIds) {
    for (const pid of finishedProductIds) {
      const specs = specsByProduct[pid]
      for (const specId of specs) {
        const qty = Math.floor(Math.random() * 30) + 5
        const invId = uuid()
        db.insert(schema.inventory).values({
          id: invId,
          storeId,
          productId: pid,
          specId,
          quantity: qty,
          createdAt: daysAgo(30),
        }).onConflictDoNothing().run()
        db.insert(schema.inventoryLog).values({
          id: uuid(),
          inventoryId: invId,
          changeType: 'incoming',
          quantity: qty,
          reason: '초기 재고',
          createdAt: daysAgo(30),
        }).onConflictDoNothing().run()
        invCount++
      }
    }
  }
  console.log(`  → 재고 ${invCount}건 생성`)

  // ── 7. 포인트 지급 (사용자 50명, 2026년도 연간지급) ──
  console.log('[7/9] 포인트 지급...')
  const activeUserIds = userIds.slice(0, 50) // 활성 사용자 위주
  let pointCount = 0
  for (const userId of activeUserIds) {
    const userRow = db.select().from(schema.users).where(eq(schema.users.id, userId)).get()
    if (!userRow || !userRow.rank) continue
    const amount = ANNUAL_POINTS[userRow.rank as Rank] ?? 300000

    const existing = db.select().from(schema.pointSummary).where(eq(schema.pointSummary.userId, userId)).get()
    if (!existing) {
      db.insert(schema.pointSummary).values({
        id: uuid(),
        userId,
        totalPoints: amount,
        usedPoints: 0,
        reservedPoints: 0,
        createdAt: daysAgo(60),
      }).onConflictDoNothing().run()
    } else {
      db.update(schema.pointSummary)
        .set({ totalPoints: existing.totalPoints + amount })
        .where(eq(schema.pointSummary.userId, userId))
        .run()
    }
    db.insert(schema.pointLedger).values({
      id: uuid(),
      userId,
      pointType: 'grant',
      amount,
      balanceAfter: amount,
      description: '2026년도 연간 피복포인트 지급',
      referenceType: 'annual',
      fiscalYear: 2026,
      createdAt: daysAgo(60),
    }).onConflictDoNothing().run()
    pointCount++
  }
  console.log(`  → 포인트 지급 ${pointCount}명`)

  // ── 8. 주문 생성 (온라인 30 + 오프라인 20) ──
  console.log('[8/9] 주문 생성...')
  const onlineStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']
  const offlineStatuses = ['delivered']
  let orderCount = 0
  let itemCount = 0
  let ticketCount = 0

  // 온라인 주문 30건
  for (let i = 0; i < 30; i++) {
    const userId = pick(activeUserIds)
    const storeId = pick(storeIds)
    const status = pick(onlineStatuses)
    const daysBack = Math.floor(Math.random() * 30) + 1
    const orderDate = new Date(Date.now() - daysBack * 86400000)

    // 완제품 1~2개
    const itemCount_ = Math.floor(Math.random() * 2) + 1
    let totalAmount = 0
    const items: Array<{ productId: string; specId: string | null; qty: number; price: number; type: string }> = []

    for (let j = 0; j < itemCount_; j++) {
      const pid = pick(finishedProductIds)
      const specs = specsByProduct[pid]
      const specId = specs.length > 0 ? pick(specs) : null
      const product = db.select().from(schema.products).where(eq(schema.products.id, pid)).get()!
      const qty = Math.floor(Math.random() * 2) + 1
      totalAmount += product.price * qty
      items.push({ productId: pid, specId, qty, price: product.price, type: 'finished' })
    }

    const orderId = uuid()
    const orderNumber = orderNum(orderDate, 10000 + i)
    db.insert(schema.orders).values({
      id: orderId,
      orderNumber,
      userId,
      storeId,
      orderType: 'online',
      productType: 'finished',
      status,
      totalAmount,
      deliveryMethod: 'parcel',
      deliveryAddress: `${randomUnit()} 생활관 ${Math.floor(Math.random() * 100) + 1}호`,
      createdAt: orderDate.getTime(),
      updatedAt: orderDate.getTime(),
    }).onConflictDoNothing().run()

    for (const item of items) {
      const itemId = uuid()
      db.insert(schema.orderItems).values({
        id: itemId,
        orderId,
        productId: item.productId,
        specId: item.specId,
        quantity: item.qty,
        unitPrice: item.price,
        subtotal: item.price * item.qty,
        itemType: 'finished',
        status: status === 'cancelled' ? 'ordered' : 'ordered',
        createdAt: orderDate.getTime(),
      }).onConflictDoNothing().run()
      itemCount++
    }

    // 포인트 처리
    const summary = db.select().from(schema.pointSummary).where(eq(schema.pointSummary.userId, userId)).get()
    if (summary) {
      if (status === 'delivered') {
        db.update(schema.pointSummary)
          .set({ usedPoints: summary.usedPoints + totalAmount })
          .where(eq(schema.pointSummary.userId, userId))
          .run()
        db.insert(schema.pointLedger).values({
          id: uuid(), userId, pointType: 'deduct', amount: totalAmount,
          balanceAfter: summary.totalPoints - summary.usedPoints - summary.reservedPoints - totalAmount,
          description: `온라인주문 ${orderNumber}`, referenceType: 'order', referenceId: orderId,
          createdAt: orderDate.getTime(),
        }).onConflictDoNothing().run()
      } else if (status === 'pending' || status === 'confirmed' || status === 'shipping') {
        const available = summary.totalPoints - summary.usedPoints - summary.reservedPoints
        if (available >= totalAmount) {
          db.update(schema.pointSummary)
            .set({ reservedPoints: summary.reservedPoints + totalAmount })
            .where(eq(schema.pointSummary.userId, userId))
            .run()
          db.insert(schema.pointLedger).values({
            id: uuid(), userId, pointType: 'reserve', amount: totalAmount,
            balanceAfter: available - totalAmount,
            description: `온라인주문 ${orderNumber}`, referenceType: 'order', referenceId: orderId,
            createdAt: orderDate.getTime(),
          }).onConflictDoNothing().run()
        }
      }
    }
    orderCount++
  }

  // 오프라인 주문 20건 + 맞춤 피복 포함
  const customProductIds = productIds.slice(15) // 맞춤 5개
  for (let i = 0; i < 20; i++) {
    const userId = pick(activeUserIds)
    const storeId = pick(storeIds)
    const daysBack = Math.floor(Math.random() * 45) + 1
    const orderDate = new Date(Date.now() - daysBack * 86400000)

    const isCustomOrder = i < 10 // 10건은 맞춤 포함
    const items: Array<{ productId: string; specId: string | null; qty: number; price: number; type: string }> = []

    if (isCustomOrder) {
      // 맞춤 1건
      const pid = pick(customProductIds)
      const product = db.select().from(schema.products).where(eq(schema.products.id, pid)).get()!
      items.push({ productId: pid, specId: null, qty: 1, price: product.price, type: 'custom' })
    } else {
      // 완제품 1~2건
      for (let j = 0; j < Math.floor(Math.random() * 2) + 1; j++) {
        const pid = pick(finishedProductIds)
        const specs = specsByProduct[pid]
        const specId = specs.length > 0 ? pick(specs) : null
        const product = db.select().from(schema.products).where(eq(schema.products.id, pid)).get()!
        items.push({ productId: pid, specId, qty: 1, price: product.price, type: 'finished' })
      }
    }

    const totalAmount = items.reduce((sum, it) => sum + it.price * it.qty, 0)
    const orderId = uuid()
    const orderNumber = orderNum(orderDate, 20000 + i)
    const productType = isCustomOrder ? 'custom' : 'finished'

    db.insert(schema.orders).values({
      id: orderId,
      orderNumber,
      userId,
      storeId,
      orderType: 'offline',
      productType,
      status: 'delivered',
      totalAmount,
      createdAt: orderDate.getTime(),
      updatedAt: orderDate.getTime(),
    }).onConflictDoNothing().run()

    for (const item of items) {
      const itemId = uuid()
      db.insert(schema.orderItems).values({
        id: itemId,
        orderId,
        productId: item.productId,
        specId: item.specId,
        quantity: item.qty,
        unitPrice: item.price,
        subtotal: item.price * item.qty,
        itemType: item.type as 'finished' | 'custom',
        status: 'ordered',
        createdAt: orderDate.getTime(),
      }).onConflictDoNothing().run()
      itemCount++

      // 맞춤 피복 → 체척권 발행
      if (item.type === 'custom') {
        const tStatus = pick(['issued', 'issued', 'registered', 'registered', 'cancel_requested', 'cancelled'])
        const tailorId = tStatus !== 'issued' ? pick(tailorIds) : null
        db.insert(schema.tailoringTickets).values({
          id: uuid(),
          ticketNumber: ticketNum(orderDate, 30000 + ticketCount),
          orderItemId: itemId,
          userId,
          productId: item.productId,
          amount: item.price * item.qty,
          status: tStatus,
          tailorId,
          registeredAt: tailorId ? daysAgo(Math.floor(Math.random() * 20) + 1) : null,
          createdAt: orderDate.getTime(),
          updatedAt: orderDate.getTime(),
        }).onConflictDoNothing().run()
        ticketCount++
      }
    }

    // 포인트 차감 (오프라인 즉시)
    const summary = db.select().from(schema.pointSummary).where(eq(schema.pointSummary.userId, userId)).get()
    if (summary) {
      db.update(schema.pointSummary)
        .set({ usedPoints: summary.usedPoints + totalAmount })
        .where(eq(schema.pointSummary.userId, userId))
        .run()
      db.insert(schema.pointLedger).values({
        id: uuid(), userId, pointType: 'deduct', amount: totalAmount,
        balanceAfter: summary.totalPoints - summary.usedPoints - summary.reservedPoints - totalAmount,
        description: `오프라인판매 ${orderNumber}`, referenceType: 'order', referenceId: orderId,
        createdAt: orderDate.getTime(),
      }).onConflictDoNothing().run()
    }
    orderCount++
  }

  // 추가 체척권 (직접 발행 시나리오)
  for (let i = 0; i < 20; i++) {
    const userId = pick(activeUserIds)
    const pid = pick(customProductIds)
    const product = db.select().from(schema.products).where(eq(schema.products.id, pid)).get()!
    const daysBack = Math.floor(Math.random() * 30) + 1
    const orderDate = new Date(Date.now() - daysBack * 86400000)

    // 더미 주문/주문상세 생성
    const orderId = uuid()
    const orderNumber = orderNum(orderDate, 40000 + i)
    db.insert(schema.orders).values({
      id: orderId,
      orderNumber,
      userId,
      storeId: pick(storeIds),
      orderType: 'offline',
      productType: 'custom',
      status: 'delivered',
      totalAmount: product.price,
      createdAt: orderDate.getTime(),
      updatedAt: orderDate.getTime(),
    }).onConflictDoNothing().run()

    const itemId = uuid()
    db.insert(schema.orderItems).values({
      id: itemId,
      orderId,
      productId: pid,
      specId: null,
      quantity: 1,
      unitPrice: product.price,
      subtotal: product.price,
      itemType: 'custom',
      status: 'ordered',
      createdAt: orderDate.getTime(),
    }).onConflictDoNothing().run()

    const tStatus = pick(['issued', 'registered', 'cancel_requested'])
    const tailorId = tStatus !== 'issued' ? pick(tailorIds) : null
    db.insert(schema.tailoringTickets).values({
      id: uuid(),
      ticketNumber: ticketNum(orderDate, 50000 + i),
      orderItemId: itemId,
      userId,
      productId: pid,
      amount: product.price,
      status: tStatus,
      tailorId,
      registeredAt: tailorId ? daysAgo(Math.floor(Math.random() * 15) + 1) : null,
      createdAt: orderDate.getTime(),
      updatedAt: orderDate.getTime(),
    }).onConflictDoNothing().run()
    ticketCount++
    orderCount++
  }

  console.log(`  → 주문 ${orderCount}건, 주문상세 ${itemCount}건, 체척권 ${ticketCount}건`)

  // ── 9. 통계 출력 ──
  console.log('\n[9/9] 데이터 검증...')
  const counts = {
    stores: db.select().from(schema.stores).all().length,
    tailors: db.select().from(schema.tailors).all().length,
    users: db.select().from(schema.users).all().length,
    categories: db.select().from(schema.categories).all().length,
    products: db.select().from(schema.products).all().length,
    specs: db.select().from(schema.productSpecs).all().length,
    inventory: db.select().from(schema.inventory).all().length,
    pointSummary: db.select().from(schema.pointSummary).all().length,
    pointLedger: db.select().from(schema.pointLedger).all().length,
    orders: db.select().from(schema.orders).all().length,
    orderItems: db.select().from(schema.orderItems).all().length,
    tickets: db.select().from(schema.tailoringTickets).all().length,
  }

  console.log('\n  === 최종 데이터 현황 ===')
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table.padEnd(15)}: ${count}건`)
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  console.log(`  ${'합계'.padEnd(15)}: ${total}건`)
  console.log('\n=== 테스트 데이터 생성 완료 ===\n')

  sqlite.close()
}

seedTestData().catch((err) => {
  console.error('오류:', err)
  sqlite.close()
  process.exit(1)
})
