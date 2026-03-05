# 피복 구매관리 시스템 - 아키텍처 설계서

| 항목 | 내용 |
|------|------|
| **문서번호** | ARCH-UNIFORM-2026-001 |
| **버전** | v1.1 |
| **작성일** | 2026-03-04 |
| **작성자** | 설계 담당자 (Architect) |
| **기반 문서** | SRS-UNIFORM-2026-001 (요구사항정의서 v1.0) |

### 변경이력

| 버전 | 일자 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0 | 2026-03-04 | Architect | 최초 작성 (Supabase 기반) |
| v1.1 | 2026-03-04 | Architect | DB를 SQLite + Drizzle ORM으로 변경, 인증을 NextAuth.js v5로 변경 |

---

## 1. 시스템 아키텍처 개요

### 1.1 전체 시스템 구성도

```
┌─────────────────────────────────────────────────────────────────┐
│                        클라이언트 (브라우저)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 군수담당자 │  │ 판매소    │  │ 체척업체  │  │ 일반사용자 │       │
│  │ /admin/* │  │ /store/* │  │ /tailor/*│  │ /my/*    │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │             │
│       └──────────────┴──────────────┴──────────────┘             │
│                              │                                   │
│                    HTTPS (브라우저 세션)                           │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────────┐
│                     Next.js 16 App Router                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  middleware.ts (NextAuth 세션 + 역할별 경로 접근 제어)        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ Server Component │  │ Client Component│  │ Server Actions │  │
│  │ (페이지 렌더링)   │  │ (_components/)  │  │ (src/actions/) │  │
│  │ SSR / RSC        │  │ 상태/이벤트 처리 │  │ 데이터 변경     │  │
│  └────────┬─────────┘  └────────┬────────┘  └───────┬────────┘  │
│           │                     │                    │           │
│           └─────────────────────┴────────────────────┘           │
│                              │                                   │
│                    Drizzle ORM (타입 안전 쿼리)                    │
│                    NextAuth.js v5 (인증/세션)                     │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                          로컬 파일 I/O
                               │
┌──────────────────────────────┴───────────────────────────────────┐
│                     SQLite (로컬 파일 DB)                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  data/clothpur.db                                        │   │
│  │  16개 테이블 + 인덱스 23개                                  │   │
│  │  better-sqlite3 드라이버 (동기식, 고성능)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 아키텍처 설계 원칙

| 원칙 | 설명 |
|------|------|
| **Server-First** | Server Component를 기본으로 사용하여 클라이언트 JS 번들 최소화 |
| **앱 레이어 권한 제어** | Next.js 미들웨어(경로 보호) + Server Action(역할 검증)으로 이중 보호 |
| **원장 패턴** | 포인트/재고 변동을 원장(ledger/log) 테이블에 기록하여 추적성 보장 |
| **불변성** | 데이터 변경 시 새 객체를 생성하고 원본 변이 금지 |
| **시스템 경계 검증** | 사용자 입력은 zod 스키마로 검증, 내부 코드는 신뢰 |
| **타입 안전 DB** | Drizzle ORM 스키마에서 TypeScript 타입 자동 추론 |

---

## 2. 기술 스택 상세

| 항목 | 기술 | 버전 | 선택 이유 |
|------|------|------|-----------|
| 프론트엔드 프레임워크 | Next.js | 16 | App Router, RSC, Server Actions 내장. 풀스택 단일 프레임워크 |
| UI 라이브러리 | React | 19 | Server Component, use() 훅, 최신 동시성 기능 |
| 타입 시스템 | TypeScript | 5.x | 컴파일 타임 타입 안전성, IDE 자동완성 |
| 스타일링 | Tailwind CSS | v4 | 유틸리티 우선, 빠른 프로토타이핑, 디자인 시스템 일관성 |
| UI 컴포넌트 | shadcn/ui | latest | 복사-붙여넣기 방식, 커스터마이징 자유도, radix-ui 기반 접근성 |
| 폼 관리 | react-hook-form | 7.x | 비제어 컴포넌트 기반, 리렌더링 최소화 |
| 유효성 검사 | zod | 3.x | TypeScript 네이티브, 런타임 + 타입 동시 검증 |
| 데이터베이스 | SQLite | 3.x | 로컬 파일 기반, 설치 불필요, 빠른 개발 환경 |
| DB 드라이버 | better-sqlite3 | 11.x | 동기식 API, 고성능, 트랜잭션 지원 |
| ORM | Drizzle ORM | 0.38.x | TypeScript 스키마, 타입 안전 쿼리, 경량, SQL 친화적 |
| 마이그레이션 | Drizzle Kit | 0.30.x | 스키마 기반 자동 마이그레이션 생성/적용 |
| 인증 | NextAuth.js v5 (Auth.js) | 5.x | Credentials Provider, 세션 관리, 미들웨어 통합 |
| 비밀번호 해시 | bcryptjs | 2.x | 순수 JS bcrypt 구현, 네이티브 의존성 없음 |
| 알림 | sonner | latest | 경량 Toast, 접근성 지원, Tailwind 통합 |
| 아이콘 | lucide-react | latest | shadcn/ui 기본 아이콘 세트 |
| 날짜 처리 | date-fns | 4.x | 트리셰이킹, 불변 API, 한국어 로케일 |
| 테이블 | @tanstack/react-table | 8.x | 헤드리스 테이블, 서버사이드 페이지네이션 연동 |
| 린터 | ESLint | 9.x | Next.js 공식 ESLint 설정 |

---

## 3. 프로젝트 폴더 구조

```
C:\Study_6\
├── data/
│   └── clothpur.db                   # SQLite DB 파일 (Git 제외)
├── drizzle/                          # Drizzle Kit 마이그레이션 출력
│   └── migrations/
├── public/                           # 정적 파일
├── src/
│   ├── middleware.ts                  # Next.js 미들웨어 (NextAuth 세션 + 역할 체크)
│   │
│   ├── app/
│   │   ├── layout.tsx                # 루트 레이아웃 (폰트, 글로벌 스타일)
│   │   ├── page.tsx                  # 로그인 페이지 (S-01, /)
│   │   ├── globals.css               # Tailwind 글로벌 CSS
│   │   │
│   │   ├── (auth)/
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx          # 비밀번호 찾기 (S-02)
│   │   │   └── change-password/
│   │   │       └── page.tsx          # 비밀번호 변경 (S-03)
│   │   │
│   │   ├── (admin)/
│   │   │   ├── layout.tsx            # 군수담당자 레이아웃
│   │   │   └── admin/
│   │   │       ├── dashboard/
│   │   │       │   └── page.tsx      # 대시보드 (A-01)
│   │   │       ├── users/
│   │   │       │   ├── page.tsx      # 사용자 목록 (A-02)
│   │   │       │   ├── new/
│   │   │       │   │   └── page.tsx  # 사용자 등록 (A-03)
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx  # 사용자 수정 (A-12)
│   │   │       ├── points/
│   │   │       │   ├── page.tsx      # 포인트 산정 (A-04)
│   │   │       │   └── status/
│   │   │       │       └── page.tsx  # 포인트 현황 (A-05)
│   │   │       ├── products/
│   │   │       │   └── page.tsx      # 품목 관리 (A-06)
│   │   │       ├── stores/
│   │   │       │   └── page.tsx      # 판매소 관리 (A-07)
│   │   │       ├── tailors/
│   │   │       │   └── page.tsx      # 체척업체 관리 (A-08)
│   │   │       ├── tickets/
│   │   │       │   └── page.tsx      # 체척권 관리 (A-09)
│   │   │       ├── settlements/
│   │   │       │   └── page.tsx      # 정산 관리 (A-10)
│   │   │       └── menus/
│   │   │           └── page.tsx      # 메뉴 관리 (A-11)
│   │   │
│   │   ├── (store)/
│   │   │   ├── layout.tsx            # 판매소 레이아웃
│   │   │   └── store/
│   │   │       ├── dashboard/
│   │   │       │   ├── page.tsx      # 대시보드 (ST-01)
│   │   │       │   └── _components/
│   │   │       │       └── dashboard-stats.tsx
│   │   │       ├── sales/
│   │   │       │   ├── page.tsx      # 판매 내역 (ST-03)
│   │   │       │   ├── new/
│   │   │       │   │   └── page.tsx  # 오프라인 판매 (ST-02)
│   │   │       │   └── return/
│   │   │       │       └── page.tsx  # 반품 처리 (ST-04)
│   │   │       ├── orders/
│   │   │       │   ├── page.tsx      # 온라인 주문 관리 (ST-05)
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx  # 온라인 주문 상세 (ST-06)
│   │   │       ├── inventory/
│   │   │       │   ├── page.tsx      # 재고 현황 (ST-07)
│   │   │       │   ├── incoming/
│   │   │       │   │   └── page.tsx  # 입고 처리 (ST-08)
│   │   │       │   └── adjust/
│   │   │       │       └── page.tsx  # 재고 조정 (ST-09)
│   │   │       ├── delivery/
│   │   │       │   └── page.tsx      # 배송지 관리 (ST-10)
│   │   │       └── stats/
│   │   │           ├── daily/
│   │   │           │   └── page.tsx  # 일별 판매현황 (ST-11)
│   │   │           ├── products/
│   │   │           │   └── page.tsx  # 품목별 판매현황 (ST-12)
│   │   │           └── users/
│   │   │               └── page.tsx  # 사용자별 판매현황 (ST-13)
│   │   │
│   │   ├── (tailor)/
│   │   │   ├── layout.tsx            # 체척업체 레이아웃
│   │   │   └── tailor/
│   │   │       ├── dashboard/
│   │   │       │   └── page.tsx      # 대시보드 (T-01)
│   │   │       └── tickets/
│   │   │           ├── page.tsx      # 체척권 현황 (T-03)
│   │   │           └── register/
│   │   │               └── page.tsx  # 체척권 등록 (T-02)
│   │   │
│   │   ├── (user)/
│   │   │   ├── layout.tsx            # 일반사용자 레이아웃
│   │   │   └── my/
│   │   │       ├── shop/
│   │   │       │   ├── page.tsx      # 쇼핑 메인 (U-01)
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx  # 품목 상세 (U-02)
│   │   │       ├── cart/
│   │   │       │   └── page.tsx      # 장바구니 (U-03)
│   │   │       ├── checkout/
│   │   │       │   └── page.tsx      # 구매 확인 (U-04)
│   │   │       ├── orders/
│   │   │       │   ├── page.tsx      # 구매 내역 (U-05)
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx  # 구매 상세 (U-06)
│   │   │       ├── points/
│   │   │       │   └── page.tsx      # 포인트 현황 (U-07)
│   │   │       └── tickets/
│   │   │           └── page.tsx      # 체척권 현황 (U-08)
│   │   │
│   │   └── api/
│   │       └── auth/
│   │           └── [...nextauth]/
│   │               └── route.ts      # NextAuth.js API 라우트
│   │
│   ├── actions/
│   │   ├── auth.ts                   # 인증 (5개 API)
│   │   ├── users.ts                  # 사용자 관리 (6개 API)
│   │   ├── products.ts               # 품목/분류/규격 (11개 API)
│   │   ├── points.ts                 # 포인트 관리 (6개 API)
│   │   ├── orders.ts                 # 주문/판매/통계 (11개 API)
│   │   ├── inventory.ts              # 재고 관리 (5개 API)
│   │   ├── tickets.ts                # 체척권 관리 (5개 API)
│   │   ├── settlements.ts            # 정산 관리 (4개 API)
│   │   ├── stores.ts                 # 판매소 관리 (4개 API)
│   │   ├── tailors.ts                # 체척업체 관리 (4개 API)
│   │   ├── delivery-zones.ts         # 배송지 관리 (4개 API)
│   │   └── menus.ts                  # 메뉴 관리 (4개 API)
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui 기본 컴포넌트 (수정 금지)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── label.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── form.tsx
│   │   │   └── sonner.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── header.tsx            # 공통 헤더 (역할별 메뉴)
│   │   │   └── page-header.tsx       # 페이지 제목 영역
│   │   │
│   │   ├── forms/
│   │   │   ├── user-form.tsx         # 사용자 등록/수정 폼
│   │   │   ├── product-form.tsx      # 품목 등록/수정 폼
│   │   │   ├── store-form.tsx        # 판매소 폼
│   │   │   ├── tailor-form.tsx       # 체척업체 폼
│   │   │   └── category-form.tsx     # 분류 폼
│   │   │
│   │   ├── tables/
│   │   │   ├── data-table.tsx        # 공통 데이터 테이블 (페이지네이션 포함)
│   │   │   └── column-header.tsx     # 정렬 가능 컬럼 헤더
│   │   │
│   │   └── shared/
│   │       ├── search-input.tsx      # 검색 입력 (디바운스)
│   │       ├── confirm-dialog.tsx    # 확인 다이얼로그
│   │       ├── status-badge.tsx      # 상태 배지
│   │       ├── point-display.tsx     # 포인트 금액 표시
│   │       └── loading-skeleton.tsx  # 로딩 스켈레톤
│   │
│   ├── lib/
│   │   ├── db.ts                     # Drizzle ORM + better-sqlite3 연결
│   │   ├── auth.ts                   # NextAuth.js v5 설정 (CredentialsProvider)
│   │   ├── schema/                   # Drizzle 스키마 (TypeScript 테이블 정의)
│   │   │   ├── users.ts              # users 테이블
│   │   │   ├── stores.ts             # stores 테이블
│   │   │   ├── tailors.ts            # tailors 테이블
│   │   │   ├── products.ts           # categories, products, product_specs 테이블
│   │   │   ├── orders.ts             # orders, order_items 테이블
│   │   │   ├── points.ts             # point_summary, point_ledger 테이블
│   │   │   ├── inventory.ts          # inventory, inventory_log 테이블
│   │   │   ├── tickets.ts            # tailoring_tickets, tailor_settlements 테이블
│   │   │   ├── menus.ts              # menus 테이블
│   │   │   ├── delivery-zones.ts     # delivery_zones 테이블
│   │   │   └── index.ts              # 전체 스키마 re-export
│   │   ├── utils.ts                  # 유틸리티 함수 (cn, formatDate 등)
│   │   ├── constants.ts              # 계급별 포인트, 상태 코드 등 상수
│   │   └── menu-config.ts            # 역할별 메뉴 설정
│   │
│   └── types/
│       └── index.ts                  # 비즈니스 타입 정의 (Drizzle 스키마에서 추론)
│
├── data/                             # DB 파일 디렉토리 (Git 제외)
├── drizzle.config.ts                 # Drizzle Kit 설정
├── .env.local                        # 환경변수 (Git 제외)
├── next.config.ts                    # Next.js 설정
├── tailwind.config.ts                # Tailwind CSS 설정
├── tsconfig.json                     # TypeScript 설정
├── package.json                      # 의존성
├── CLAUDE.md                         # 프로젝트 컨텍스트
└── 요구사항정의서_v1.0.md              # 요구사항 문서
```

**총 39개 페이지** (공통 3 + 관리자 12 + 판매소 13 + 체척업체 3 + 사용자 8)

---

## 4. 라우팅 아키텍처

### 4.1 역할별 Route Group 구조

Next.js App Router의 Route Group `(groupName)`을 사용하여 역할별 페이지를 분리한다. Route Group은 URL 경로에 영향을 주지 않고, 레이아웃만 분리하는 역할을 한다.

| Route Group | URL 접두사 | 역할 | 레이아웃 |
|-------------|-----------|------|----------|
| `(auth)` | `/forgot-password`, `/change-password` | 공개/인증 | 최소 레이아웃 |
| `(admin)` | `/admin/*` | admin | 관리자 헤더 + 메뉴 |
| `(store)` | `/store/*` | store | 판매소 헤더 + 메뉴 |
| `(tailor)` | `/tailor/*` | tailor | 체척업체 헤더 + 메뉴 |
| `(user)` | `/my/*` | user | 사용자 헤더 + 메뉴 |

### 4.2 미들웨어 처리 흐름

```
요청 수신
    │
    ▼
[1] 공개 경로 확인 ──→ YES ──→ 통과 (/, /forgot-password, /api/auth/*)
    │
    NO
    │
    ▼
[2] NextAuth 세션 확인 (auth()) ──→ 세션 없음 ──→ / (로그인) 리다이렉트
    │
    세션 있음 (session.user.role 포함)
    │
    ▼
[3] 요청 경로 vs 사용자 역할 비교
    │
    ├── 일치 ──→ 통과
    │
    └── 불일치 ──→ 사용자 역할의 대시보드로 리다이렉트
                    (admin → /admin/dashboard)
                    (store → /store/dashboard)
                    (tailor → /tailor/dashboard)
                    (user → /my/shop)
```

### 4.3 역할별 리다이렉트 맵

| 역할 | 로그인 후 리다이렉트 | 접근 불가 시 리다이렉트 |
|------|-------------------|----------------------|
| admin | `/admin/dashboard` | `/admin/dashboard` |
| store | `/store/dashboard` | `/store/dashboard` |
| tailor | `/tailor/dashboard` | `/tailor/dashboard` |
| user | `/my/shop` | `/my/shop` |

---

## 5. 컴포넌트 아키텍처

### 5.1 Server Component vs Client Component 분리 기준

| 구분 | Server Component | Client Component |
|------|-----------------|-----------------|
| **기본** | 모든 page.tsx, layout.tsx | 명시적으로 필요한 경우만 |
| **데이터** | Drizzle ORM 직접 쿼리 | Server Action 호출 |
| **사용 시점** | 목록 조회, 데이터 표시 | 폼 입력, 버튼 이벤트, 상태 관리 |
| **파일 위치** | `page.tsx` | `_components/*.tsx` |
| **선언** | 기본 (선언 불필요) | `"use client"` 상단 선언 |

### 5.2 컴포넌트 계층 구조

```
루트 레이아웃 (app/layout.tsx) [Server]
├── 폰트, 글로벌 CSS, Toaster, SessionProvider
│
├── 역할별 레이아웃 (e.g. (admin)/layout.tsx) [Server]
│   ├── getServerSession() 호출로 사용자 정보 조회
│   ├── Header 컴포넌트 [Client] (메뉴 토글, 로그아웃)
│   │   └── 역할별 MENU_CONFIG 기반 Pull-Down 메뉴
│   │
│   └── children (페이지)
│       └── page.tsx [Server]
│           ├── Drizzle ORM 데이터 조회
│           ├── 공통 컴포넌트 (DataTable, StatusBadge 등)
│           └── _components/ [Client]
│               ├── 폼 컴포넌트 (react-hook-form + zod)
│               ├── 필터/검색 컴포넌트
│               └── 액션 버튼 (Dialog, 상태 변경 등)
```

### 5.3 `_components/` 패턴

각 페이지에서 Client Component가 필요한 경우 동일 디렉토리 내 `_components/` 폴더에 배치한다. `_` 접두사는 Next.js App Router에서 라우트로 인식되지 않도록 하는 규칙이다.

```
store/sales/new/
├── page.tsx                    # [Server] 판매소/품목 데이터 조회 후 전달
└── _components/
    ├── offline-sale-form.tsx   # [Client] 판매 폼 (사용자 검색, 품목 선택)
    └── product-selector.tsx    # [Client] 품목/규격 선택 컴포넌트
```

---

## 6. Server Actions 설계

### 6.1 기본 패턴

모든 Server Action은 동일한 패턴을 따른다.

```typescript
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function exampleAction(input: SomeInput) {
  // 1. 인증 확인
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "인증이 필요합니다" };
  }

  // 2. 역할 검증 (필요 시)
  if (session.user.role !== "admin") {
    return { success: false, error: "권한이 없습니다" };
  }

  // 3. 입력 검증 (zod)
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "유효성 검사 실패" };
  }

  // 4. 비즈니스 로직 실행 (Drizzle ORM)
  const [result] = await db
    .insert(users)
    .values({ id: crypto.randomUUID(), ...parsed.data })
    .returning();

  // 5. 캐시 무효화
  revalidatePath("/relevant/path");

  // 6. 결과 반환
  return { success: true, data: result };
}
```

### 6.2 반환 타입 표준

```typescript
// 기본 반환 타입
type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

// 사용 예시
export async function createUser(input: UserInput): Promise<ActionResult<{ id: string }>> { ... }
export async function deleteUser(id: string): Promise<ActionResult> { ... }
```

### 6.3 에러 처리 전략

| 단계 | 에러 유형 | 처리 방법 |
|------|----------|----------|
| 인증 | 세션 만료/미인증 | `{ success: false, error: "인증이 필요합니다" }` |
| 권한 | 역할 불일치 | `{ success: false, error: "권한이 없습니다" }` |
| 검증 | zod 유효성 실패 | `{ success: false, error: "유효성 검사 실패" }` |
| 비즈니스 | 포인트 부족, 재고 부족 등 | 구체적 에러 메시지 반환 |
| DB | SQLite/Drizzle 에러 | `{ success: false, error: error.message }` |
| 예외 | try-catch 예외 | `{ success: false, error: "처리 중 오류가 발생했습니다" }` |

### 6.4 트랜잭션 처리 방법

SQLite + better-sqlite3는 동기식 네이티브 트랜잭션을 지원한다. Drizzle ORM의 `db.transaction()` 메서드를 사용한다.

```
[트랜잭션이 필요한 작업]
─────────────────────────────────────────────────
오프라인 판매 : orders + order_items + inventory + inventory_log + point_ledger + point_summary
배송 완료 확정 : inventory + inventory_log + point_ledger (deduct + release) + point_summary
반품 처리     : order_items + inventory + inventory_log + point_ledger + point_summary
포인트 일괄 지급: point_ledger (N건) + point_summary (N건)
```

트랜잭션 패턴:

```typescript
import { db } from "@/lib/db";
import { orders, orderItems, inventory, pointLedger, pointSummary } from "@/lib/schema";

const result = db.transaction((tx) => {
  // 1. 주문 생성
  const [order] = tx.insert(orders).values({ ... }).returning();

  // 2. 주문 항목 생성
  tx.insert(orderItems).values(items.map(item => ({ ... })));

  // 3. 재고 차감
  tx.update(inventory)
    .set({ quantity: sql`quantity - ${qty}` })
    .where(eq(inventory.id, invId));

  // 4. 포인트 차감
  tx.insert(pointLedger).values({ ... });
  tx.update(pointSummary)
    .set({ usedPoints: sql`used_points + ${amount}` })
    .where(eq(pointSummary.userId, userId));

  return order;
});
```

SQLite의 트랜잭션은 ACID를 완전히 보장하며, better-sqlite3의 동기식 특성 덕분에 트랜잭션 내 모든 작업이 원자적으로 실행된다. Supabase에서 필요했던 RPC 함수 우회가 불필요하다.

### 6.5 역할 검증 패턴

RLS가 없으므로, 모든 Server Action에서 명시적으로 역할과 소속을 검증한다.

```typescript
// 공통 인증/역할 검증 헬퍼
async function requireAuth(allowedRoles?: string[]) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("인증이 필요합니다");
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new Error("권한이 없습니다");
  }
  return session.user;
}

// 판매소 소속 검증 예시
async function requireStoreAccess(storeId: string) {
  const user = await requireAuth(["store", "admin"]);
  if (user.role === "store" && user.storeId !== storeId) {
    throw new Error("해당 판매소에 대한 권한이 없습니다");
  }
  return user;
}
```

---

## 7. 데이터베이스 설계

### 7.1 Drizzle ORM + better-sqlite3 연결

```typescript
// src/lib/db.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("data/clothpur.db");

// WAL 모드 활성화 (동시 읽기 성능 향상)
sqlite.pragma("journal_mode = WAL");
// 외래키 제약조건 활성화
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
```

### 7.2 Drizzle 스키마 예시

```typescript
// src/lib/schema/users.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),                    // UUID (앱에서 생성)
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),   // bcrypt 해시
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "store", "tailor", "user"] }).notNull(),
  rank: text("rank"),
  militaryNumber: text("military_number"),
  unit: text("unit"),
  enlistDate: text("enlist_date"),                 // ISO 8601 (YYYY-MM-DD)
  promotionDate: text("promotion_date"),
  retirementDate: text("retirement_date"),
  storeId: text("store_id").references(() => stores.id),
  tailorId: text("tailor_id").references(() => tailors.id),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// 타입 추론
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### 7.3 SQLite 데이터 타입 매핑

| 요구사항 타입 | PostgreSQL (이전) | SQLite (현재) | 비고 |
|-------------|-------------------|---------------|------|
| UUID | `uuid` + `gen_random_uuid()` | `TEXT` + `crypto.randomUUID()` | 앱 레이어에서 생성 |
| 날짜/시간 | `TIMESTAMPTZ` | `TEXT` (ISO 8601) | `datetime('now')` 기본값 |
| 날짜만 | `DATE` | `TEXT` (YYYY-MM-DD) | |
| 부울 | `BOOLEAN` | `INTEGER` (0/1) | Drizzle `mode: "boolean"` |
| 정수 | `INTEGER` | `INTEGER` | 동일 |
| 문자열 | `VARCHAR(N)` | `TEXT` | SQLite는 길이 제한 없음 |
| 자동 번호 | `SEQUENCE` | 앱 레이어 생성 | `ORD-YYYYMMDD-NNNNN` 형태 |

### 7.4 자동 번호 생성 (앱 레이어)

PostgreSQL SEQUENCE 대신 앱 레이어에서 주문번호/체척권번호를 생성한다.

```typescript
// 주문번호: ORD-YYYYMMDD-NNNNN
function generateOrderNumber(): string {
  const date = format(new Date(), "yyyyMMdd");
  const count = db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(like(orders.orderNumber, `ORD-${date}-%`))
    .get();
  const seq = String((count?.count ?? 0) + 1).padStart(5, "0");
  return `ORD-${date}-${seq}`;
}

// 체척권번호: TKT-YYYYMMDD-NNNNN (동일 패턴)
```

### 7.5 Drizzle Kit 마이그레이션

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "data/clothpur.db",
  },
});
```

마이그레이션 명령어:

| 명령어 | 설명 |
|--------|------|
| `npx drizzle-kit generate` | 스키마 변경으로부터 마이그레이션 SQL 생성 |
| `npx drizzle-kit push` | 스키마를 DB에 직접 반영 (개발용) |
| `npx drizzle-kit studio` | Drizzle Studio (DB 브라우저) 실행 |

---

## 8. 인증/권한 아키텍처

### 8.1 NextAuth.js v5 인증 흐름

```
[로그인]
사용자 → 이메일/비밀번호 입력
      → signIn("credentials", { email, password })
      → CredentialsProvider: DB에서 사용자 조회 → bcrypt.compare()
      → 성공: JWT 세션 생성 (role, storeId, tailorId 포함) → 역할별 대시보드 리다이렉트
      → 실패: 에러 메시지 표시

[비밀번호 변경]
사용자 → 현재 비밀번호 + 새 비밀번호 입력
      → Server Action: bcrypt.compare(현재) → bcrypt.hash(새) → DB 업데이트

[로그아웃]
사용자 → 로그아웃 버튼
      → signOut()
      → 세션 삭제 → / 리다이렉트
```

### 8.2 NextAuth.js 설정

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const user = db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .get();

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          storeId: user.storeId,
          tailorId: user.tailorId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.storeId = user.storeId;
        token.tailorId = user.tailorId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as string;
      session.user.storeId = token.storeId as string | null;
      session.user.tailorId = token.tailorId as string | null;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
```

### 8.3 미들웨어 역할 체크 로직

```typescript
// src/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ROLE_PATH_MAP: Record<string, string> = {
  admin: "/admin",
  store: "/store",
  tailor: "/tailor",
  user: "/my",
};

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  admin: "/admin/dashboard",
  store: "/store/dashboard",
  tailor: "/tailor/dashboard",
  user: "/my/shop",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // 1. 공개 경로 → 통과
  if (isPublicPath(pathname)) return NextResponse.next();

  // 2. 세션 없음 → 로그인 리다이렉트
  if (!session?.user) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 3. 역할별 경로 확인
  const userRole = session.user.role;
  const allowedPrefix = ROLE_PATH_MAP[userRole];
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL(ROLE_DASHBOARD_MAP[userRole], req.url));
  }

  return NextResponse.next();
});
```

### 8.4 권한 제어 전략 (RLS 대체)

RLS가 없으므로, 앱 레이어에서 역할과 소속 기반 데이터 접근 제어를 수행한다.

```
[1차: Next.js 미들웨어]
  ┌─────────────────────────────┐
  │ NextAuth 세션 기반           │  → 잘못된 역할의 URL 접근 차단
  │ 경로 패턴 + session.user.role│  → 비인증 사용자 차단
  └─────────────┬───────────────┘
                │
[2차: Server Action 내 역할 검증]
  ┌─────────────┴───────────────┐
  │ auth() 세션에서 role 확인     │  → 역할별 허용 액션 제한
  │ storeId/tailorId 소속 확인    │  → 자기 소속 데이터만 접근
  │ userId 본인 확인              │  → user 역할 본인 데이터만
  └─────────────────────────────┘
```

역할별 데이터 접근 범위:

| 테이블 | admin | store | tailor | user |
|--------|-------|-------|--------|------|
| users | 전체 | 본인 + 주문 사용자 조회 | 본인 | 본인 |
| orders | 전체 | 자기 판매소 | - | 본인 |
| inventory | 전체 조회 | 자기 판매소 | - | 재고 조회 |
| tailoring_tickets | 전체 | 조회 | 자사 + 미등록 | 본인 |
| point_summary | 전체 | 조회 | - | 본인 |
| point_ledger | 전체 | - | - | 본인 |

---

## 9. 상태관리 전략

### 9.1 Server State (Drizzle ORM 직접 조회)

**원칙**: 대부분의 데이터는 서버에서 조회하여 Server Component에서 직접 렌더링한다. 별도의 클라이언트 상태 관리 라이브러리(Redux, Zustand 등)를 사용하지 않는다.

```typescript
// page.tsx (Server Component)
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq, like } from "drizzle-orm";

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const PAGE_SIZE = 20;

  const data = db
    .select()
    .from(users)
    .where(params.role ? eq(users.role, params.role) : undefined)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();

  const [{ count }] = db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .all();

  return <UsersTable users={data} totalCount={count} />;
}
```

### 9.2 URL State (검색/필터 params)

목록 페이지의 검색, 필터, 페이지네이션 상태는 URL 쿼리 파라미터로 관리한다. 이를 통해 북마크 가능, 뒤로가기 지원, 서버 컴포넌트와의 연동이 자연스럽다.

```
/admin/users?page=2&role=store&search=홍길동
/store/orders?status=pending&page=1
/store/stats/daily?from=2026-01-01&to=2026-01-31
```

### 9.3 Client State (최소화 원칙)

클라이언트 상태는 다음 경우에만 사용한다.

| 용도 | 예시 |
|------|------|
| 폼 입력 상태 | react-hook-form이 관리 |
| UI 토글 | Dialog 열기/닫기, 드롭다운 |
| 장바구니 (임시) | localStorage 또는 useState |
| 낙관적 업데이트 | Server Action 호출 후 즉시 UI 반영 |

---

## 10. 성능 설계

### 10.1 Server Component 우선 전략

| 전략 | 효과 |
|------|------|
| 페이지를 Server Component로 구성 | 클라이언트 JS 번들 크기 최소화 |
| Client Component는 `_components/`에 격리 | 필요한 부분만 hydration |
| `"use client"` 경계를 최대한 아래로 | 서버 렌더링 범위 극대화 |

### 10.2 페이지네이션 (서버사이드)

모든 목록 페이지는 서버사이드 페이지네이션을 적용한다. 페이지당 20건.

```typescript
const PAGE_SIZE = 20;
const offset = (page - 1) * PAGE_SIZE;

const data = db
  .select()
  .from(users)
  .limit(PAGE_SIZE)
  .offset(offset)
  .all();
```

### 10.3 SQLite 성능 최적화

| 설정 | 효과 |
|------|------|
| `journal_mode = WAL` | Write-Ahead Logging 모드. 읽기와 쓰기 동시 수행 가능 |
| `foreign_keys = ON` | 외래키 제약조건 활성화 (데이터 무결성) |
| 인덱스 23개 | 주요 FK, 검색/필터 컬럼에 인덱스 적용 |
| better-sqlite3 동기식 | 네트워크 지연 없음, 로컬 파일 직접 접근 |

### 10.4 인덱스 전략

주요 FK 컬럼과 검색/필터에 사용되는 컬럼에 인덱스를 적용한다 (23개).

| 대상 | 인덱스 컬럼 |
|------|------------|
| users | role, rank, store_id, tailor_id, is_active |
| orders | user_id, store_id, status, order_type, created_at |
| order_items | order_id, product_id |
| inventory | store_id, product_id, spec_id |
| point_ledger | user_id, fiscal_year, point_type |
| point_summary | user_id (UNIQUE) |
| tailoring_tickets | user_id, tailor_id, status |
| categories | parent_id, level |
| products | category_id, product_type |

Drizzle 스키마에서 인덱스 정의:

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  storeId: text("store_id").references(() => stores.id),
  status: text("status").notNull().default("pending"),
  // ...
}, (table) => [
  index("idx_orders_user_id").on(table.userId),
  index("idx_orders_store_id").on(table.storeId),
  index("idx_orders_status").on(table.status),
  index("idx_orders_created_at").on(table.createdAt),
]);
```

---

## 11. 보안 설계

### 11.1 환경변수 관리

| 변수 | 접근 범위 | 설명 |
|------|----------|------|
| `NEXTAUTH_SECRET` | 서버 전용 | NextAuth JWT 서명 비밀키 (필수) |
| `NEXTAUTH_URL` | 서버 전용 | 애플리케이션 기본 URL (예: `http://localhost:3000`) |
| `AUTH_TRUST_HOST` | 서버 전용 | 프로덕션 환경에서 `true` 설정 (선택) |

- `.env.local`에 보관, `.gitignore`에 등록하여 Git 커밋 방지
- `data/` 디렉토리도 `.gitignore`에 등록 (DB 파일 보호)

### 11.2 비밀번호 보안

| 항목 | 방법 |
|------|------|
| 해시 알고리즘 | bcryptjs (salt round: 12) |
| 평문 저장 금지 | 비밀번호는 반드시 해시 후 `password_hash` 컬럼에 저장 |
| 최소 길이 | 8자 이상 (zod 스키마로 검증) |
| 비교 | `bcrypt.compare()`로 안전하게 비교 |

```typescript
import bcrypt from "bcryptjs";

// 해시 생성 (사용자 등록 시)
const passwordHash = await bcrypt.hash(password, 12);

// 비밀번호 비교 (로그인 시)
const isValid = await bcrypt.compare(inputPassword, user.passwordHash);
```

### 11.3 SQL 인젝션 방지

Drizzle ORM은 내부적으로 prepared statement를 사용한다. 직접 SQL 문자열 조합을 절대 하지 않는다.

```typescript
// 안전: Drizzle ORM 사용
const result = db
  .select()
  .from(users)
  .where(eq(users.role, userInput))
  .all();

// 위험: 절대 금지
// sqlite.exec(`SELECT * FROM users WHERE role = '${userInput}'`);
```

### 11.4 XSS 방지

- React는 기본적으로 JSX 내 문자열을 이스케이프 처리한다
- `dangerouslySetInnerHTML` 사용 금지
- 사용자 입력 데이터는 렌더링 전 검증/정제

### 11.5 세션 보안

| 항목 | 설정 |
|------|------|
| 세션 전략 | JWT (서버 상태 없음, SQLite에 세션 테이블 불필요) |
| 토큰 수명 | 기본 30일 (설정 가능) |
| CSRF 보호 | NextAuth 내장 CSRF 토큰 |
| 쿠키 보안 | `httpOnly`, `secure` (프로덕션), `sameSite: lax` |

---

## 12. 의존성 목록

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-auth": "^5.0.0",
    "drizzle-orm": "^0.38.0",
    "better-sqlite3": "^11.7.0",
    "bcryptjs": "^2.4.3",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.24.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@tanstack/react-table": "^8.20.0",
    "lucide-react": "^0.470.0",
    "sonner": "^2.0.0",
    "date-fns": "^4.1.0",
    "tailwind-merge": "^2.6.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/bcryptjs": "^2.4.0",
    "drizzle-kit": "^0.30.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.5.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.0.0",
    "@eslint/eslintrc": "^3.2.0"
  }
}
```

---

## 13. 개발/배포 환경

### 13.1 환경변수 목록

`.env.local` 파일에 다음 변수를 설정한다.

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `NEXTAUTH_SECRET` | 필수 | NextAuth JWT 서명 비밀키 (`openssl rand -base64 32`로 생성) |
| `NEXTAUTH_URL` | 필수 | 애플리케이션 URL (기본: `http://localhost:3000`) |
| `AUTH_TRUST_HOST` | 선택 | 프로덕션 배포 시 `true` |

### 13.2 npm 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (localhost:3000) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |
| `npx drizzle-kit push` | 스키마를 DB에 직접 반영 (개발용) |
| `npx drizzle-kit generate` | 마이그레이션 SQL 생성 |
| `npx drizzle-kit studio` | Drizzle Studio (DB 브라우저) |

### 13.3 개발 환경 요구사항

| 항목 | 최소 버전 |
|------|----------|
| Node.js | 20.x |
| npm | 10.x |
| Git | 2.x |

### 13.4 .gitignore 추가 항목

```
data/
*.db
*.db-wal
*.db-shm
```

---

> **문서 끝** | 아키텍처 설계서 v1.1 | 총 13개 섹션 | SQLite + Drizzle ORM + NextAuth.js v5 기반
