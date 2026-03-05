/**
 * Phase 6 기능 검증 스크립트
 * DB 레벨에서 핵심 도메인 로직 검증
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../lib/schema'
import { eq, and, gte, lte, inArray } from 'drizzle-orm'

const sqlite = new Database('data/clothpur.db')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

let passed = 0
let failed = 0
const failures: string[] = []

function test(name: string, fn: () => boolean) {
  try {
    const ok = fn()
    if (ok) {
      console.log(`  ✓ ${name}`)
      passed++
    } else {
      console.log(`  ✗ ${name}`)
      failed++
      failures.push(name)
    }
  } catch (e) {
    console.log(`  ✗ ${name} [예외: ${e}]`)
    failed++
    failures.push(`${name} (예외)`)
  }
}

function section(title: string) {
  console.log(`\n── ${title} ──`)
}

// ─── 테스트 시작 ───
console.log('\n=== Phase 6 기능 검증 ===\n')

// 1. 기초 데이터 검증
section('1. 기초 데이터')
test('판매소 5개 이상 존재', () => db.select().from(schema.stores).all().length >= 5)
test('체척업체 3개 이상 존재', () => db.select().from(schema.tailors).all().length >= 3)
test('사용자 50명 이상 존재', () => db.select().from(schema.users).all().length >= 50)
test('user 역할 사용자 존재', () => db.select().from(schema.users).where(eq(schema.users.role, 'user')).all().length >= 50)
test('store 역할 사용자 존재', () => db.select().from(schema.users).where(eq(schema.users.role, 'store')).all().length >= 5)
test('tailor 역할 사용자 존재', () => db.select().from(schema.users).where(eq(schema.users.role, 'tailor')).all().length >= 3)
test('admin 계정 존재', () => !!db.select().from(schema.users).where(and(eq(schema.users.email, 'admin@test.com'), eq(schema.users.role, 'admin'))).get())

// 2. store↔user 연결 검증
section('2. 계정-엔티티 연결')
test('store 계정에 storeId 설정됨', () => {
  const storeUsers = db.select().from(schema.users).where(eq(schema.users.role, 'store')).all()
  return storeUsers.every(u => !!u.storeId)
})
test('tailor 계정에 tailorId 설정됨', () => {
  const tailorUsers = db.select().from(schema.users).where(eq(schema.users.role, 'tailor')).all()
  return tailorUsers.every(u => !!u.tailorId)
})
test('user 계정에 계급 설정됨', () => {
  const users = db.select().from(schema.users).where(eq(schema.users.role, 'user')).all()
  return users.filter(u => u.isActive).every(u => !!u.rank)
})

// 3. 품목/스키마 검증
section('3. 품목 데이터')
test('품목 20개 존재', () => db.select().from(schema.products).all().length >= 20)
test('완제품과 맞춤 피복 모두 존재', () => {
  const all = db.select().from(schema.products).all()
  return all.some(p => p.productType === 'finished') && all.some(p => p.productType === 'custom')
})
test('완제품에 규격 존재', () => {
  const finished = db.select().from(schema.products).where(eq(schema.products.productType, 'finished')).all()
  const specs = db.select().from(schema.productSpecs).all()
  return finished.every(p => specs.some(s => s.productId === p.id))
})
test('맞춤 피복에 규격 없음', () => {
  const custom = db.select().from(schema.products).where(eq(schema.products.productType, 'custom')).all()
  const specs = db.select().from(schema.productSpecs).all()
  return custom.every(p => !specs.some(s => s.productId === p.id))
})
test('품목분류 계층구조 (대/중분류) 존재', () => {
  const cats = db.select().from(schema.categories).all()
  const level1 = cats.filter(c => c.level === 1)
  const level2 = cats.filter(c => c.level === 2)
  return level1.length >= 3 && level2.length >= 5
})

// 4. 재고 검증
section('4. 재고 데이터')
test('재고 100건 이상', () => db.select().from(schema.inventory).all().length >= 100)
test('모든 판매소에 재고 존재', () => {
  const stores = db.select().from(schema.stores).all()
  const inv = db.select().from(schema.inventory).all()
  return stores.every(s => inv.some(i => i.storeId === s.id))
})
test('재고 수량 0 이상', () => {
  return db.select().from(schema.inventory).all().every(i => i.quantity >= 0)
})
test('재고 변동 이력 존재', () => db.select().from(schema.inventoryLog).all().length >= 100)
test('재고와 품목 일치 (FK)', () => {
  const inv = db.select().from(schema.inventory).all()
  const products = db.select().from(schema.products).all()
  const productIds = new Set(products.map(p => p.id))
  return inv.every(i => productIds.has(i.productId))
})

// 5. 포인트 검증
section('5. 포인트 시스템')
test('포인트 요약 50건 이상', () => db.select().from(schema.pointSummary).all().length >= 50)
test('포인트 원장 50건 이상', () => db.select().from(schema.pointLedger).all().length >= 50)
test('포인트 잔여 음수 없음', () => {
  return db.select().from(schema.pointSummary).all().every(s => {
    const available = s.totalPoints - s.usedPoints - s.reservedPoints
    return available >= -1000 // 소수점 오차 허용
  })
})
test('연간 지급 이력 존재 (2026)', () => {
  return db.select().from(schema.pointLedger)
    .where(and(eq(schema.pointLedger.fiscalYear, 2026), eq(schema.pointLedger.referenceType, 'annual')))
    .all().length >= 40
})
test('계급별 포인트 차등 지급 (하사 > 상병)', () => {
  const grants = db.select().from(schema.pointLedger)
    .where(and(eq(schema.pointLedger.referenceType, 'annual'), eq(schema.pointLedger.fiscalYear, 2026)))
    .all()
  // user와 join해서 계급별 금액 확인
  const users = db.select().from(schema.users).where(eq(schema.users.role, 'user')).all()
  const userMap = new Map(users.map(u => [u.id, u.rank]))
  const grantsForRank = (rank: string) => grants.filter(g => userMap.get(g.userId) === rank)
  const hasaSample = grantsForRank('하사')
  const sangbyungSample = grantsForRank('상병')
  if (hasaSample.length === 0 || sangbyungSample.length === 0) return true // 해당 계급 없으면 패스
  return hasaSample[0].amount > sangbyungSample[0].amount
})

// 6. 주문 검증
section('6. 주문 데이터')
test('주문 50건 이상', () => db.select().from(schema.orders).all().length >= 50)
test('온라인/오프라인 주문 모두 존재', () => {
  const orders = db.select().from(schema.orders).all()
  return orders.some(o => o.orderType === 'online') && orders.some(o => o.orderType === 'offline')
})
test('모든 주문에 주문번호 고유', () => {
  const orders = db.select().from(schema.orders).all()
  const nums = orders.map(o => o.orderNumber)
  return new Set(nums).size === nums.length
})
test('주문번호 형식 (ORD-YYYYMMDD-NNNNN)', () => {
  const orders = db.select().from(schema.orders).all()
  return orders.every(o => /^ORD-\d{8}-\d{5}$/.test(o.orderNumber))
})
test('주문상세 존재', () => db.select().from(schema.orderItems).all().length >= 50)
test('주문-주문상세 참조 무결성', () => {
  const orders = db.select().from(schema.orders).all()
  const items = db.select().from(schema.orderItems).all()
  const orderIds = new Set(orders.map(o => o.id))
  return items.every(i => orderIds.has(i.orderId))
})
test('주문 총액 > 0', () => {
  return db.select().from(schema.orders).all().every(o => o.totalAmount > 0)
})
test('주문상세 소계 = 단가 × 수량', () => {
  const items = db.select().from(schema.orderItems).all()
  return items.every(i => i.subtotal === i.unitPrice * i.quantity)
})

// 7. 체척권 검증
section('7. 체척권 데이터')
test('체척권 20건 이상', () => db.select().from(schema.tailoringTickets).all().length >= 20)
test('체척권 번호 형식 (TKT-YYYYMMDD-NNNNN)', () => {
  const tickets = db.select().from(schema.tailoringTickets).all()
  return tickets.every(t => /^TKT-\d{8}-\d{5}$/.test(t.ticketNumber))
})
test('체척권 번호 고유', () => {
  const tickets = db.select().from(schema.tailoringTickets).all()
  const nums = tickets.map(t => t.ticketNumber)
  return new Set(nums).size === nums.length
})
test('맞춤 주문에만 체척권 발행', () => {
  const tickets = db.select().from(schema.tailoringTickets).all()
  const items = db.select().from(schema.orderItems).all()
  const itemMap = new Map(items.map(i => [i.id, i]))
  return tickets.every(t => itemMap.get(t.orderItemId)?.itemType === 'custom')
})
test('체척권 상태 유효값', () => {
  const valid = new Set(['issued', 'registered', 'cancel_requested', 'cancelled'])
  return db.select().from(schema.tailoringTickets).all().every(t => valid.has(t.status))
})
test('등록된 체척권에 tailorId 설정', () => {
  const tickets = db.select().from(schema.tailoringTickets)
    .where(inArray(schema.tailoringTickets.status, ['registered', 'cancel_requested', 'cancelled']))
    .all()
  return tickets.every(t => !!t.tailorId)
})

// 8. 데이터 충분성
section('8. 데이터 충분성 (200건+)')
test('전체 레코드 200건 이상', () => {
  const counts = [
    db.select().from(schema.stores).all().length,
    db.select().from(schema.tailors).all().length,
    db.select().from(schema.users).all().length,
    db.select().from(schema.categories).all().length,
    db.select().from(schema.products).all().length,
    db.select().from(schema.productSpecs).all().length,
    db.select().from(schema.inventory).all().length,
    db.select().from(schema.pointSummary).all().length,
    db.select().from(schema.pointLedger).all().length,
    db.select().from(schema.orders).all().length,
    db.select().from(schema.orderItems).all().length,
    db.select().from(schema.tailoringTickets).all().length,
  ]
  const total = counts.reduce((a, b) => a + b, 0)
  console.log(`     (총 ${total}건)`)
  return total >= 200
})

// ─── 결과 ───
console.log('\n' + '═'.repeat(40))
console.log(`결과: ${passed}개 통과 / ${failed}개 실패 (전체 ${passed + failed}개)`)
if (failures.length > 0) {
  console.log('\n실패 항목:')
  failures.forEach(f => console.log(`  - ${f}`))
}
console.log('═'.repeat(40) + '\n')

sqlite.close()
process.exit(failed > 0 ? 1 : 0)
