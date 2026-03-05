# DB 스키마 설계서

| 항목 | 내용 |
|------|------|
| **문서번호** | DB-UNIFORM-2026-001 |
| **버전** | v1.1 |
| **작성일** | 2026-03-04 |
| **시스템명** | 피복 구매관리 시스템 (CLOTH_PUR SYSTEM) |

## 변경이력

| 버전 | 일자 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| v1.0 | 2026-03-04 | 최초 작성 (Supabase PostgreSQL) | 데이터 담당자 |
| v1.1 | 2026-03-04 | SQLite + Drizzle ORM으로 전면 변경 | 데이터 담당자 |

---

## 1. 기술 스택

| 항목 | 기술 |
|------|------|
| DB | SQLite (로컬 파일: `data/clothpur.db`) |
| ORM | Drizzle ORM + better-sqlite3 |
| 스키마 정의 | TypeScript (`src/lib/schema/*.ts`) |
| 마이그레이션 | Drizzle Kit (`drizzle-kit push / generate`) |
| 인증 | NextAuth.js v5 (Credentials Provider) |
| 권한 제어 | Server Action / 미들웨어에서 역할 검증 (RLS 없음) |

### SQLite 제약사항

| PostgreSQL 기능 | SQLite 대체 방안 |
|----------------|-----------------|
| UUID (`gen_random_uuid()`) | TEXT 타입, 앱 레이어에서 `crypto.randomUUID()` 생성 |
| TIMESTAMPTZ | INTEGER (Unix timestamp, 밀리초) |
| SEQUENCE | 앱 레이어에서 번호 생성 로직 구현 |
| RLS 정책 | Server Action 내 `getServerSession()` 역할 확인 |
| CHECK 제약조건 | Drizzle `check()` 또는 앱 레이어 검증 |
| ARRAY 타입 | TEXT (JSON 문자열 저장) |

---

## 2. ERD 개요

```
[stores] 1──N [users] N──1 [tailors]
              │ 1:1
              [point_summary]
              │ 1:N
              [point_ledger]
              │ 1:N
[stores] 1──N [orders] 1──N [order_items] 1──N [tailoring_tickets] N──1 [tailors]
              │                    │
              │                    N:1 [products] N──1 [categories(self-ref)]
              │                    N:1 [product_specs] N──1 [products]
              │
[stores] 1──N [delivery_zones]
[stores] 1──N [inventory] 1──N [inventory_log]
              N:1 [products]
              N:1 [product_specs]

[tailors] 1──N [tailor_settlements]
[menus] self-ref (parent_id)
```

### 관계 요약

| 부모 테이블 | 자식 테이블 | 관계 | FK 컬럼 |
|------------|-----------|------|---------|
| stores | users | 1:N | users.store_id |
| tailors | users | 1:N | users.tailor_id |
| stores | delivery_zones | 1:N | delivery_zones.store_id |
| stores | inventory | 1:N | inventory.store_id |
| stores | orders | 1:N | orders.store_id |
| categories | categories | self-ref | categories.parent_id |
| categories | products | 1:N | products.category_id |
| products | product_specs | 1:N | product_specs.product_id |
| products | inventory | 1:N | inventory.product_id |
| product_specs | inventory | 1:N | inventory.spec_id |
| inventory | inventory_log | 1:N | inventory_log.inventory_id |
| users | point_summary | 1:1 | point_summary.user_id |
| users | point_ledger | 1:N | point_ledger.user_id |
| users | orders | 1:N | orders.user_id |
| delivery_zones | orders | 1:N | orders.delivery_zone_id |
| orders | order_items | 1:N | order_items.order_id |
| products | order_items | 1:N | order_items.product_id |
| product_specs | order_items | 1:N | order_items.spec_id |
| order_items | tailoring_tickets | 1:N | tailoring_tickets.order_item_id |
| users | tailoring_tickets | 1:N | tailoring_tickets.user_id |
| tailors | tailoring_tickets | 1:N | tailoring_tickets.tailor_id |
| tailors | tailor_settlements | 1:N | tailor_settlements.tailor_id |
| menus | menus | self-ref | menus.parent_id |

---

## 3. 테이블 목록

| # | 테이블명 | 한글명 | 목적 | Drizzle 스키마 파일 |
|---|---------|--------|------|-------------------|
| 1 | stores | 피복판매소 | 판매소 기본정보 관리 | `schema/stores.ts` |
| 2 | tailors | 체척업체 | 맞춤피복 제작업체 정보 | `schema/stores.ts` |
| 3 | users | 사용자 | 4개 역할 통합 사용자 | `schema/users.ts` |
| 4 | categories | 품목분류 | 대/중/소 3단계 분류 | `schema/products.ts` |
| 5 | products | 품목 | 완제품/맞춤피복 품목 | `schema/products.ts` |
| 6 | product_specs | 규격 | 완제품 사이즈 관리 | `schema/products.ts` |
| 7 | delivery_zones | 배송지 | 판매소별 직접배송 지역 | `schema/stores.ts` |
| 8 | inventory | 재고 | 판매소+품목+규격별 재고 | `schema/inventory.ts` |
| 9 | inventory_log | 재고변동이력 | 입고/판매/반품/조정 이력 | `schema/inventory.ts` |
| 10 | point_summary | 포인트요약 | 사용자별 포인트 잔액 | `schema/points.ts` |
| 11 | point_ledger | 포인트원장 | 모든 포인트 변동 이력 | `schema/points.ts` |
| 12 | orders | 주문 | 온/오프라인 주문 통합 | `schema/orders.ts` |
| 13 | order_items | 주문상세 | 주문별 품목 목록 | `schema/orders.ts` |
| 14 | tailoring_tickets | 체척권 | 맞춤피복 체척권 관리 | `schema/tickets.ts` |
| 15 | tailor_settlements | 체척업체정산 | 업체별 정산 관리 | `schema/tickets.ts` |
| 16 | menus | 메뉴 | 역할별 메뉴 관리 | `schema/users.ts` |

---

## 4. 테이블별 상세 명세

> **공통 규칙**:
> - PK `id`: TEXT 타입, `crypto.randomUUID()`로 앱 레이어에서 생성, `$defaultFn` 활용
> - 타임스탬프: INTEGER (Unix timestamp 밀리초), `$defaultFn(() => Date.now())`
> - 불리언: INTEGER (0/1), SQLite에 BOOLEAN 네이티브 타입 없음

### 4.1 stores (피복판매소)

**목적**: 피복판매소의 기본 정보를 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 판매소 고유 ID |
| name | TEXT | text | O | - | 판매소명 |
| address | TEXT | text | X | - | 주소 |
| phone | TEXT | text | X | - | 연락처 |
| manager_name | TEXT | text | X | - | 담당자명 |
| is_active | INTEGER | integer (mode: boolean) | O | 1 (true) | 사용 여부 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |
| updated_at | INTEGER | integer | O | Date.now() | 수정일시 |

**인덱스**: idx_stores_is_active (is_active)

---

### 4.2 tailors (체척업체)

**목적**: 맞춤피복 제작 업체의 기본 정보와 정산 계좌 정보를 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 업체 고유 ID |
| name | TEXT | text | O | - | 업체명 |
| business_number | TEXT | text | X | - | 사업자번호 |
| representative | TEXT | text | X | - | 대표자명 |
| address | TEXT | text | X | - | 주소 |
| phone | TEXT | text | X | - | 연락처 |
| bank_name | TEXT | text | X | - | 은행명 |
| account_number | TEXT | text | X | - | 계좌번호 |
| account_holder | TEXT | text | X | - | 예금주 |
| is_active | INTEGER | integer (mode: boolean) | O | 1 (true) | 사용 여부 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |
| updated_at | INTEGER | integer | O | Date.now() | 수정일시 |

**인덱스**: idx_tailors_is_active (is_active)

---

### 4.3 users (사용자)

**목적**: 4개 역할(admin, store, tailor, user) 통합 사용자 정보. NextAuth.js 인증 연동.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 사용자 고유 ID |
| email | TEXT | text | O | - | 이메일 (로그인 ID, UNIQUE) |
| password_hash | TEXT | text | O | - | bcrypt 해시 비밀번호 |
| name | TEXT | text | O | - | 이름 |
| role | TEXT | text | O | - | 역할 (admin/store/tailor/user) |
| rank | TEXT | text | X | - | 계급 (12종, user만) |
| military_number | TEXT | text | X | - | 군번/사번 |
| unit | TEXT | text | X | - | 소속 |
| enlist_date | TEXT | text | X | - | 입대일 (YYYY-MM-DD) |
| promotion_date | TEXT | text | X | - | 최근 진급일 (YYYY-MM-DD) |
| retirement_date | TEXT | text | X | - | 퇴직예정일 (YYYY-MM-DD) |
| store_id | TEXT | text | X | - | 소속 판매소 (FK→stores) |
| tailor_id | TEXT | text | X | - | 소속 업체 (FK→tailors) |
| is_active | INTEGER | integer (mode: boolean) | O | 1 (true) | 활성 상태 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |
| updated_at | INTEGER | integer | O | Date.now() | 수정일시 |

**인덱스**:
- UNIQUE (email)
- idx_users_role (role)
- idx_users_store_id (store_id)
- idx_users_tailor_id (tailor_id)
- idx_users_is_active (is_active)

**비고**: 날짜 컬럼(enlist_date, promotion_date, retirement_date)은 TEXT (ISO 8601 `YYYY-MM-DD` 형식). 날짜 비교/계산은 앱 레이어에서 처리.

---

### 4.4 categories (품목분류)

**목적**: 대/중/소 3단계 품목 분류를 자기참조로 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 분류 고유 ID |
| name | TEXT | text | O | - | 분류명 |
| parent_id | TEXT | text | X | - | 상위 분류 ID (FK→categories) |
| level | INTEGER | integer | O | - | 단계 (1:대, 2:중, 3:소) |
| sort_order | INTEGER | integer | O | 0 | 정렬 순서 |
| is_active | INTEGER | integer (mode: boolean) | O | 1 (true) | 사용 여부 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |

**인덱스**: idx_categories_parent_id (parent_id)

---

### 4.5 products (품목)

**목적**: 완제품/맞춤피복 품목의 기본 정보를 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 품목 고유 ID |
| name | TEXT | text | O | - | 품목명 |
| category_id | TEXT | text | O | - | 소분류 ID (FK→categories) |
| product_type | TEXT | text | O | - | 품목유형 (finished/custom) |
| price | INTEGER | integer | O | - | 단가 (원) |
| image_url | TEXT | text | X | - | 이미지 URL |
| description | TEXT | text | X | - | 설명 |
| is_active | INTEGER | integer (mode: boolean) | O | 1 (true) | 사용 여부 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |
| updated_at | INTEGER | integer | O | Date.now() | 수정일시 |

**인덱스**:
- idx_products_category_id (category_id)
- idx_products_product_type (product_type)
- idx_products_is_active (is_active)

---

### 4.6 product_specs (규격)

**목적**: 완제품의 사이즈(규격) 정보를 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 규격 고유 ID |
| product_id | TEXT | text | O | - | 품목 ID (FK→products) |
| spec_name | TEXT | text | O | - | 규격명 (95, 100, 105 등) |
| sort_order | INTEGER | integer | O | 0 | 정렬 순서 |
| is_active | INTEGER | integer (mode: boolean) | O | 1 (true) | 사용 여부 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |

**인덱스**: idx_product_specs_product_id (product_id)

---

### 4.7 delivery_zones (배송지)

**목적**: 판매소별 직접 배송 가능 지역을 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 배송지 고유 ID |
| store_id | TEXT | text | O | - | 판매소 ID (FK→stores) |
| name | TEXT | text | O | - | 배송지명 |
| address | TEXT | text | X | - | 주소 |
| note | TEXT | text | X | - | 비고 |
| is_active | INTEGER | integer (mode: boolean) | O | 1 (true) | 사용 여부 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |

**인덱스**: idx_delivery_zones_store_id (store_id)

---

### 4.8 inventory (재고)

**목적**: 판매소+품목+규격 단위의 현재 재고 수량을 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 재고 고유 ID |
| store_id | TEXT | text | O | - | 판매소 ID (FK→stores) |
| product_id | TEXT | text | O | - | 품목 ID (FK→products) |
| spec_id | TEXT | text | O | - | 규격 ID (FK→product_specs) |
| quantity | INTEGER | integer | O | 0 | 현재 재고 수량 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |
| updated_at | INTEGER | integer | O | Date.now() | 수정일시 |

**인덱스**:
- idx_inventory_store_id (store_id)
- idx_inventory_product_spec (product_id, spec_id)
- UNIQUE (store_id, product_id, spec_id)

---

### 4.9 inventory_log (재고변동이력)

**목적**: 재고의 모든 변동(입고, 판매, 반품, 조정) 이력을 기록한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 이력 고유 ID |
| inventory_id | TEXT | text | O | - | 재고 ID (FK→inventory) |
| change_type | TEXT | text | O | - | 변동유형 (incoming/sale/return/adjust_up/adjust_down) |
| quantity | INTEGER | integer | O | - | 변동수량 (양수) |
| reason | TEXT | text | X | - | 사유 |
| reference_id | TEXT | text | X | - | 참조 ID (주문 등) |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |

**인덱스**: idx_inventory_log_inventory_id (inventory_id)

---

### 4.10 point_summary (포인트요약)

**목적**: 사용자별 포인트 잔액 요약. users와 1:1 관계.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 요약 고유 ID |
| user_id | TEXT | text | O | - | 사용자 ID (FK→users, UNIQUE) |
| total_points | INTEGER | integer | O | 0 | 총 지급 포인트 |
| used_points | INTEGER | integer | O | 0 | 사용 포인트 |
| reserved_points | INTEGER | integer | O | 0 | 예약 포인트 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |

**인덱스**: UNIQUE (user_id)
**가용포인트 산출**: total_points - used_points - reserved_points

---

### 4.11 point_ledger (포인트원장)

**목적**: 모든 포인트 변동(지급, 차감, 추가, 반환, 예약, 해제) 이력을 시간순으로 기록한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 원장 고유 ID |
| user_id | TEXT | text | O | - | 사용자 ID (FK→users) |
| point_type | TEXT | text | O | - | 변동유형 (grant/deduct/add/return/reserve/release) |
| amount | INTEGER | integer | O | - | 금액 (양수) |
| balance_after | INTEGER | integer | X | - | 변동 후 잔액 |
| description | TEXT | text | X | - | 설명 |
| reference_type | TEXT | text | X | - | 참조유형 (order/ticket/annual) |
| reference_id | TEXT | text | X | - | 참조 ID |
| fiscal_year | INTEGER | integer | X | - | 회계연도 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |

**인덱스**:
- idx_point_ledger_user_id (user_id)
- idx_point_ledger_fiscal_year (fiscal_year)
- idx_point_ledger_created_at (created_at)

---

### 4.12 orders (주문)

**목적**: 온라인/오프라인 주문을 통합 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 주문 고유 ID |
| order_number | TEXT | text | O | - | 주문번호 (ORD-YYYYMMDD-NNNNN, UNIQUE) |
| user_id | TEXT | text | O | - | 구매자 ID (FK→users) |
| store_id | TEXT | text | X | - | 판매소 ID (FK→stores, 맞춤피복 온라인 주문 시 NULL) |
| order_type | TEXT | text | O | - | 주문유형 (online/offline) |
| product_type | TEXT | text | O | - | 품목유형 (finished/custom) |
| status | TEXT | text | O | 'pending' | 주문상태 (pending/confirmed/shipping/delivered/cancelled/returned) |
| total_amount | INTEGER | integer | O | - | 총 금액 (원) |
| delivery_method | TEXT | text | X | - | 배송방법 (parcel/direct, 온라인만) |
| delivery_zone_id | TEXT | text | X | - | 직접배송지 ID (FK→delivery_zones) |
| delivery_address | TEXT | text | X | - | 택배 배송주소 |
| cancel_reason | TEXT | text | X | - | 취소 사유 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |
| updated_at | INTEGER | integer | O | Date.now() | 수정일시 |

**인덱스**:
- UNIQUE (order_number)
- idx_orders_user_id (user_id)
- idx_orders_store_id (store_id)
- idx_orders_status (status)
- idx_orders_order_type (order_type)
- idx_orders_created_at (created_at)

---

### 4.13 order_items (주문상세)

**목적**: 주문별 품목 목록을 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 주문상세 고유 ID |
| order_id | TEXT | text | O | - | 주문 ID (FK→orders) |
| product_id | TEXT | text | O | - | 품목 ID (FK→products) |
| spec_id | TEXT | text | X | - | 규격 ID (FK→product_specs, 완제품만) |
| quantity | INTEGER | integer | O | 1 | 수량 |
| unit_price | INTEGER | integer | O | - | 단가 |
| subtotal | INTEGER | integer | O | - | 소계 (단가 x 수량) |
| item_type | TEXT | text | O | - | 품목유형 (finished/custom) |
| status | TEXT | text | O | 'ordered' | 항목상태 (ordered/returned) |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |

**인덱스**:
- idx_order_items_order_id (order_id)
- idx_order_items_product_id (product_id)

---

### 4.14 tailoring_tickets (체척권)

**목적**: 맞춤피복 체척권의 발행, 등록, 취소 상태를 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 체척권 고유 ID |
| ticket_number | TEXT | text | O | - | 체척권번호 (TKT-YYYYMMDD-NNNNN, UNIQUE) |
| order_item_id | TEXT | text | O | - | 주문상세 ID (FK→order_items) |
| user_id | TEXT | text | O | - | 사용자 ID (FK→users) |
| product_id | TEXT | text | O | - | 품목 ID (FK→products) |
| amount | INTEGER | integer | O | - | 금액 |
| status | TEXT | text | O | 'issued' | 상태 (issued/registered/cancel_requested/cancelled) |
| tailor_id | TEXT | text | X | - | 등록 체척업체 ID (FK→tailors) |
| registered_at | INTEGER | integer | X | - | 업체 등록 일시 |
| created_at | INTEGER | integer | O | Date.now() | 발행일시 |
| updated_at | INTEGER | integer | O | Date.now() | 수정일시 |

**인덱스**:
- UNIQUE (ticket_number)
- idx_tailoring_tickets_user_id (user_id)
- idx_tailoring_tickets_tailor_id (tailor_id)
- idx_tailoring_tickets_status (status)

---

### 4.15 tailor_settlements (체척업체정산)

**목적**: 체척업체별 정산 금액과 확정 상태를 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 정산 고유 ID |
| tailor_id | TEXT | text | O | - | 업체 ID (FK→tailors) |
| period_start | TEXT | text | O | - | 정산 시작일 (YYYY-MM-DD) |
| period_end | TEXT | text | O | - | 정산 종료일 (YYYY-MM-DD) |
| ticket_count | INTEGER | integer | O | 0 | 체척권 수 |
| total_amount | INTEGER | integer | O | 0 | 정산 총액 |
| status | TEXT | text | O | 'pending' | 정산상태 (pending/confirmed) |
| confirmed_at | INTEGER | integer | X | - | 확정 일시 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |
| updated_at | INTEGER | integer | O | Date.now() | 수정일시 |

**인덱스**: idx_tailor_settlements_tailor_id (tailor_id)

---

### 4.16 menus (메뉴)

**목적**: 역할별 메뉴 항목을 자기참조 구조로 관리한다.

| 컬럼명 | SQLite 타입 | Drizzle 타입 | NOT NULL | DEFAULT | 설명 |
|--------|------------|-------------|----------|---------|------|
| id | TEXT | text | O | randomUUID() | 메뉴 고유 ID |
| name | TEXT | text | O | - | 메뉴명 |
| url | TEXT | text | X | - | URL 경로 |
| parent_id | TEXT | text | X | - | 상위 메뉴 ID (FK→menus) |
| sort_order | INTEGER | integer | O | 0 | 정렬 순서 |
| roles | TEXT | text | O | - | 접근 역할 (JSON 문자열, 예: `["admin","store"]`) |
| is_active | INTEGER | integer (mode: boolean) | O | 1 (true) | 사용 여부 |
| created_at | INTEGER | integer | O | Date.now() | 생성일시 |

**인덱스**: idx_menus_parent_id (parent_id)

---

## 5. 권한 제어 설계

> **SQLite에는 RLS가 없다.** 모든 권한 제어는 Server Action / 미들웨어에서 처리한다.

### 5.1 미들웨어 (1차 - 라우트 보호)

NextAuth.js 세션 기반으로 `src/middleware.ts`에서 역할별 경로 접근을 제어한다.

| 경로 패턴 | 접근 허용 역할 | 비인증 시 |
|----------|--------------|----------|
| `/`, `/forgot-password` | 모든 사용자 | 허용 |
| `/admin/**` | admin | `/` 리다이렉트 |
| `/store/**` | store | `/` 리다이렉트 |
| `/tailor/**` | tailor | `/` 리다이렉트 |
| `/my/**` | user | `/` 리다이렉트 |

### 5.2 Server Action (2차 - 데이터 접근 제어)

모든 Server Action에서 `getServerSession()`으로 인증/역할을 확인한다.

| 테이블 | admin | store | tailor | user |
|--------|-------|-------|--------|------|
| users | ALL | SELECT(user만) | - | SELECT(본인) |
| stores | ALL | SELECT | SELECT | SELECT |
| tailors | ALL | SELECT | SELECT | SELECT |
| categories | ALL | SELECT | SELECT | SELECT |
| products | ALL | SELECT | SELECT | SELECT |
| product_specs | ALL | SELECT | SELECT | SELECT |
| delivery_zones | ALL | ALL(자기판매소) | - | SELECT |
| inventory | SELECT | ALL(자기판매소) | - | SELECT |
| inventory_log | SELECT | ALL(자기판매소) | - | - |
| point_summary | ALL | SELECT | - | SELECT(본인) |
| point_ledger | ALL | - | - | SELECT(본인) |
| orders | ALL | ALL(자기판매소) | - | SELECT(본인), INSERT(본인) |
| order_items | ALL | ALL(자기판매소) | - | SELECT(본인) |
| tailoring_tickets | ALL | SELECT | ALL(자사+미등록) | SELECT(본인) |
| tailor_settlements | ALL | - | SELECT(자사) | - |
| menus | ALL | SELECT | SELECT | SELECT |

### 5.3 Server Action 권한 검증 패턴

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function someAction() {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "인증이 필요합니다" };
  if (session.user.role !== "admin") return { success: false, error: "권한이 없습니다" };
  // 비즈니스 로직
}
```

---

## 6. 번호 생성 전략

> SQLite에는 PostgreSQL SEQUENCE가 없다. 앱 레이어에서 번호를 생성한다.

### 6.1 주문번호 (ORD-YYYYMMDD-NNNNN)

```typescript
// 당일 최대 번호 조회 후 +1
const today = format(new Date(), 'yyyyMMdd');
const prefix = `ORD-${today}-`;
const lastOrder = db.select({ orderNumber: orders.orderNumber })
  .from(orders)
  .where(like(orders.orderNumber, `${prefix}%`))
  .orderBy(desc(orders.orderNumber))
  .limit(1)
  .get();

const seq = lastOrder
  ? parseInt(lastOrder.orderNumber.slice(-5)) + 1
  : 1;
const orderNumber = `${prefix}${String(seq).padStart(5, '0')}`;
```

### 6.2 체척권번호 (TKT-YYYYMMDD-NNNNN)

동일 패턴으로 `tailoring_tickets.ticket_number`에서 당일 최대값 조회 후 +1.

---

## 7. 인덱스 전략

| # | 인덱스명 | 테이블 | 컬럼 | 이유 |
|---|---------|--------|------|------|
| 1 | idx_stores_is_active | stores | is_active | 활성 판매소 필터 |
| 2 | idx_tailors_is_active | tailors | is_active | 활성 업체 필터 |
| 3 | idx_users_role | users | role | 역할별 사용자 조회 |
| 4 | idx_users_store_id | users | store_id | 판매소별 소속 사용자 |
| 5 | idx_users_tailor_id | users | tailor_id | 업체별 소속 사용자 |
| 6 | idx_users_is_active | users | is_active | 활성 사용자 필터 |
| 7 | idx_categories_parent_id | categories | parent_id | 하위 분류 조회 |
| 8 | idx_products_category_id | products | category_id | 분류별 품목 조회 |
| 9 | idx_products_product_type | products | product_type | 품목유형 필터 |
| 10 | idx_products_is_active | products | is_active | 활성 품목 필터 |
| 11 | idx_product_specs_product_id | product_specs | product_id | 품목별 규격 조회 |
| 12 | idx_delivery_zones_store_id | delivery_zones | store_id | 판매소별 배송지 |
| 13 | idx_inventory_store_id | inventory | store_id | 판매소별 재고 |
| 14 | idx_inventory_product_spec | inventory | product_id, spec_id | 품목+규격별 재고 |
| 15 | uq_inventory_store_product_spec | inventory | store_id, product_id, spec_id | 중복 방지 (UNIQUE) |
| 16 | idx_inventory_log_inventory_id | inventory_log | inventory_id | 재고별 변동이력 |
| 17 | idx_point_ledger_user_id | point_ledger | user_id | 사용자별 포인트 이력 |
| 18 | idx_point_ledger_fiscal_year | point_ledger | fiscal_year | 연도별 중복 확인 |
| 19 | idx_point_ledger_created_at | point_ledger | created_at | 시간순 이력 조회 |
| 20 | idx_orders_user_id | orders | user_id | 사용자별 주문 |
| 21 | idx_orders_store_id | orders | store_id | 판매소별 주문 |
| 22 | idx_orders_status | orders | status | 상태별 주문 필터 |
| 23 | idx_orders_created_at | orders | created_at | 주문일순 정렬 |

추가 인덱스:
- idx_orders_order_type (orders.order_type)
- idx_order_items_order_id (order_items.order_id)
- idx_order_items_product_id (order_items.product_id)
- idx_tailoring_tickets_user_id (tailoring_tickets.user_id)
- idx_tailoring_tickets_tailor_id (tailoring_tickets.tailor_id)
- idx_tailoring_tickets_status (tailoring_tickets.status)
- idx_tailor_settlements_tailor_id (tailor_settlements.tailor_id)
- idx_menus_parent_id (menus.parent_id)

---

## 8. 데이터 무결성 설계

### 8.1 포인트 정합성 (NFR-INT-001)
- `point_summary.total_points - used_points - reserved_points`로 가용포인트 산출
- `SUM(point_ledger)` 합산 결과와 교차 검증 가능

### 8.2 재고 정합성 (NFR-INT-002)
- `inventory.quantity >= 0` 검증은 앱 레이어에서 처리
- `inventory_log` 합산으로 교차 검증 가능

### 8.3 중복 지급 방지 (NFR-INT-004)
- `point_ledger.fiscal_year`와 `point_type = 'grant'` 조합으로 연도별 중복 확인

### 8.4 updated_at 갱신 (NFR-INT-005)
- SQLite에 트리거 대신 앱 레이어에서 UPDATE 시 `Date.now()` 설정
- Drizzle의 `$onUpdate` 또는 Server Action에서 명시적 갱신

### 8.5 번호 자동생성 (NFR-INT-006)
- 앱 레이어에서 당일 최대 번호 조회 + 1 방식

### 8.6 참조 무결성
- SQLite 외래키 지원 (`PRAGMA foreign_keys = ON` 필수)
- Drizzle의 `references()` 정의, better-sqlite3 연결 시 `pragma foreign_keys = ON` 실행

### 8.7 동시성 (NFR-CON-001, 002)
- SQLite는 WAL 모드로 읽기 동시성 지원
- 쓰기는 단일 프로세스 보장 (better-sqlite3는 동기식)
- 재고 차감 등은 트랜잭션 내에서 처리 (`db.transaction()`)

---

## 9. Drizzle 스키마 파일 구조

```
src/lib/
├── db.ts                 # Drizzle + better-sqlite3 연결 설정
├── auth.ts               # NextAuth.js v5 설정
└── schema/
    ├── index.ts           # 전체 export
    ├── users.ts           # users, menus
    ├── stores.ts          # stores, tailors, delivery_zones
    ├── products.ts        # categories, products, product_specs
    ├── orders.ts          # orders, order_items
    ├── points.ts          # point_summary, point_ledger
    ├── inventory.ts       # inventory, inventory_log
    └── tickets.ts         # tailoring_tickets, tailor_settlements
```

---

> **문서 끝** | 테이블 16개 | 인덱스 23+8개 | Drizzle 스키마 파일 8개 | RLS 없음 (Server Action 역할 검증)
