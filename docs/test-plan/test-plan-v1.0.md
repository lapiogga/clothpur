# 테스트 계획서 v1.0

**프로젝트**: CLOTH_PUR SYSTEM (군 피복 포인트 관리 시스템)
**작성일**: 2026-03-05
**작성자**: tester
**버전**: 1.0

---

## 1. 개요

### 1.1 목적

Phase 1~5에서 구현된 CLOTH_PUR 시스템의 핵심 도메인 로직과 데이터 무결성을 검증한다. DB 레벨 기능 테스트를 통해 시스템의 신뢰성을 확보한다.

### 1.2 테스트 범위

| 구분 | 대상 | 제외 |
|------|------|------|
| 포함 | 핵심 도메인 로직, 데이터 무결성, FK 참조, 비즈니스 규칙 | E2E UI 테스트, 성능 테스트, 보안 침투 테스트 |

### 1.3 테스트 환경

- **DB**: SQLite (`data/clothpur.db`)
- **런타임**: Node.js 24 + tsx (TypeScript 실행)
- **테스트 도구**: 커스텀 검증 스크립트 (`scripts/test-functional.ts`)
- **테스트 데이터**: `scripts/seed-test-data.ts` 생성 (825건)

---

## 2. 테스트 전략

### 2.1 테스트 유형

**DB 레벨 기능 검증 (Functional Verification)**

- 애플리케이션 레이어를 우회하여 Drizzle ORM으로 DB 직접 조회
- 각 테스트는 `boolean` 반환 (pass/fail)
- 예외 발생 시 실패로 처리

### 2.2 테스트 데이터 전략

- 시드 스크립트(`scripts/seed-test-data.ts`) 실행으로 표준 데이터 생성
- 총 825건 (200건 기준 초과)
- 재실행 시 `onConflictDoNothing()` 패턴으로 중복 방지

### 2.3 합격 기준

- **전체 합격**: 40/40 테스트 통과 (100%)
- **섹션별 합격**: 각 섹션 내 모든 케이스 통과

---

## 3. 테스트 케이스

### 섹션 1: 기초 데이터

| ID | 테스트명 | 검증 조건 | 합격 기준 |
|----|---------|---------|---------|
| T1-01 | 판매소 존재 | `stores` 테이블 레코드 수 | ≥ 5개 |
| T1-02 | 체척업체 존재 | `tailors` 테이블 레코드 수 | ≥ 3개 |
| T1-03 | 사용자 존재 | `users` 테이블 레코드 수 | ≥ 50명 |
| T1-04 | user 역할 존재 | `role = 'user'` 레코드 수 | ≥ 50명 |
| T1-05 | store 역할 존재 | `role = 'store'` 레코드 수 | ≥ 5개 |
| T1-06 | tailor 역할 존재 | `role = 'tailor'` 레코드 수 | ≥ 3개 |
| T1-07 | admin 계정 존재 | `email = 'admin@test.com'` + `role = 'admin'` | 1개 이상 |

### 섹션 2: 계정-엔티티 연결

| ID | 테스트명 | 검증 조건 | 합격 기준 |
|----|---------|---------|---------|
| T2-01 | store 계정 storeId 설정 | `role = 'store'` 사용자의 `storeId` 값 | 전원 NOT NULL |
| T2-02 | tailor 계정 tailorId 설정 | `role = 'tailor'` 사용자의 `tailorId` 값 | 전원 NOT NULL |
| T2-03 | user 계정 계급 설정 | 활성 `role = 'user'` 사용자의 `rank` 값 | 전원 NOT NULL |

### 섹션 3: 품목 데이터

| ID | 테스트명 | 검증 조건 | 합격 기준 |
|----|---------|---------|---------|
| T3-01 | 품목 수량 | `products` 테이블 레코드 수 | ≥ 20개 |
| T3-02 | 품목 유형 다양성 | `productType` 값 분포 | `finished`, `custom` 모두 존재 |
| T3-03 | 완제품 규격 존재 | 완제품 품목과 `productSpecs` 매핑 | 모든 완제품에 규격 ≥ 1개 |
| T3-04 | 맞춤 피복 규격 없음 | 맞춤 품목과 `productSpecs` 매핑 | 어떤 맞춤 품목도 규격 없음 |
| T3-05 | 분류 계층구조 | `categories` `level` 값 분포 | level 1 ≥ 3개, level 2 ≥ 5개 |

### 섹션 4: 재고 데이터

| ID | 테스트명 | 검증 조건 | 합격 기준 |
|----|---------|---------|---------|
| T4-01 | 재고 건수 | `inventory` 테이블 레코드 수 | ≥ 100건 |
| T4-02 | 판매소별 재고 | 각 판매소에 재고 존재 여부 | 모든 판매소에 재고 ≥ 1건 |
| T4-03 | 재고 수량 유효성 | `quantity` 값 | 모든 레코드 ≥ 0 |
| T4-04 | 재고 변동 이력 | `inventoryLog` 테이블 레코드 수 | ≥ 100건 |
| T4-05 | 재고-품목 FK 무결성 | `inventory.productId` → `products.id` | 모든 레코드 참조 유효 |

### 섹션 5: 포인트 시스템

| ID | 테스트명 | 검증 조건 | 합격 기준 |
|----|---------|---------|---------|
| T5-01 | 포인트 요약 건수 | `pointSummary` 테이블 레코드 수 | ≥ 50건 |
| T5-02 | 포인트 원장 건수 | `pointLedger` 테이블 레코드 수 | ≥ 50건 |
| T5-03 | 포인트 잔여 음수 방지 | `totalPoints - usedPoints - reservedPoints` | 모든 레코드 ≥ -1000 (소수점 오차 허용) |
| T5-04 | 연간 지급 이력 | `referenceType = 'annual'`, `fiscalYear = 2026` | ≥ 40건 |
| T5-05 | 계급별 차등 지급 | 하사 연간 지급액 vs 상병 연간 지급액 | 하사 > 상병 |

### 섹션 6: 주문 데이터

| ID | 테스트명 | 검증 조건 | 합격 기준 |
|----|---------|---------|---------|
| T6-01 | 주문 건수 | `orders` 테이블 레코드 수 | ≥ 50건 |
| T6-02 | 주문 유형 다양성 | `orderType` 값 분포 | `online`, `offline` 모두 존재 |
| T6-03 | 주문번호 고유성 | `orderNumber` 중복 여부 | 모든 번호 고유 |
| T6-04 | 주문번호 형식 | `orderNumber` 정규식 | `ORD-YYYYMMDD-NNNNN` 패턴 100% |
| T6-05 | 주문상세 건수 | `orderItems` 테이블 레코드 수 | ≥ 50건 |
| T6-06 | 주문-상세 FK 무결성 | `orderItems.orderId` → `orders.id` | 모든 레코드 참조 유효 |
| T6-07 | 주문 총액 유효성 | `orders.totalAmount` 값 | 모든 레코드 > 0 |
| T6-08 | 주문상세 소계 정확성 | `subtotal = unitPrice × quantity` | 모든 레코드 일치 |

### 섹션 7: 체척권 데이터

| ID | 테스트명 | 검증 조건 | 합격 기준 |
|----|---------|---------|---------|
| T7-01 | 체척권 건수 | `tailoringTickets` 테이블 레코드 수 | ≥ 20건 |
| T7-02 | 체척권 번호 형식 | `ticketNumber` 정규식 | `TKT-YYYYMMDD-NNNNN` 패턴 100% |
| T7-03 | 체척권 번호 고유성 | `ticketNumber` 중복 여부 | 모든 번호 고유 |
| T7-04 | 체척권 발행 대상 | `tailoringTickets.orderItemId` → `orderItems` | 연결된 품목의 `itemType = 'custom'` |
| T7-05 | 체척권 상태 유효성 | `status` 값 | `issued`, `registered`, `cancel_requested`, `cancelled` 외 없음 |
| T7-06 | 등록 체척권 tailorId | `status in (registered, cancel_requested, cancelled)` | 모든 레코드 `tailorId` NOT NULL |

### 섹션 8: 데이터 충분성

| ID | 테스트명 | 검증 조건 | 합격 기준 |
|----|---------|---------|---------|
| T8-01 | 전체 레코드 수 | 12개 테이블 레코드 합계 | ≥ 200건 |

---

## 4. 테스트 실행 방법

### 4.1 선행 조건

```bash
# DB 마이그레이션
npm run db:migrate

# 테스트 데이터 생성
npx tsx scripts/seed-test-data.ts
```

### 4.2 테스트 실행

```bash
npx tsx scripts/test-functional.ts
```

### 4.3 결과 해석

- `✓` : 통과
- `✗` : 실패 (실패 항목은 결과 하단에 목록 출력)
- 프로세스 종료 코드: 0 (전체 통과) / 1 (실패 존재)

---

## 5. 리스크 및 제약사항

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 랜덤 데이터 생성 특성상 특정 조건 미충족 가능 | 간헐적 테스트 실패 | `onConflictDoNothing()` + 충분한 데이터 양으로 완화 |
| SQLite 동기 방식으로 동시성 테스트 불가 | 동시 요청 시나리오 미검증 | 운영 환경 단일 인스턴스 가정으로 허용 |
| UI/E2E 테스트 미포함 | 화면 렌더링 오류 미검증 | 향후 Playwright 기반 E2E 추가 예정 |
