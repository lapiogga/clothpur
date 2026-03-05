# 피복관리 시스템(CLOTH_PUR SYSTEM)

# 시스템 개요

군 피복 포인트 기반 온/오프라인 구매관리 시스템. 계급별 피복포인트를 지급하고, 피복판매소를 통한 온라인/오프라인 구매, 재고관리, 체척권(맞춤피복) 관리를 수행한다.

# 개발 방식

## Team Agent 구성

| Agent | 역할 | 담당 |
|-------|------|------|
| project-manager | 총괄 관리자 | 전체 진행 관리, Phase 전환, Sub Agent 지시 |
| planner | 기획 담당자 | 기능명세, 화면명세 |
| designer | 설계 담당자 | 아키텍처 설계, 설계 검증 |
| data-modeler | 데이터 담당자 | DB 스키마, Drizzle 스키마, 마이그레이션 |
| developer | 개발 담당자 | 실제 코드 구현 (Next.js App Router + SQLite + Drizzle ORM) |
| tester | 테스트 담당자 | 테스트 계획, 데이터 200건+, 기능/품질 테스트 |

각 Team Agent는 필요에 따라 Sub Agent를 생성/업무지시/관리한다.

## 개발 파이프라인 (Claude Forge)

```
PLAN (구현계획 수립) → TDD (테스트 주도 개발) → CODE_REVIEW (코드 리뷰) → HANDOFF-VERIFY (독립 컨텍스트 최종 검증)
```

## 개발 명령어

```bash
npm run dev         # 개발 서버 실행 (localhost:3000)
npm run build       # 프로덕션 빌드
npm run lint        # ESLint 검사
npm run db:generate # Drizzle 스키마로 마이그레이션 파일 생성
npm run db:migrate  # 마이그레이션 실행
npm run db:studio   # Drizzle Studio (DB 조회)
```

환경변수 필수: `.env.local`에 `NEXTAUTH_SECRET`, `NEXTAUTH_URL` 설정.

## 기술 스택

- **Next.js 16** (App Router, React 19, TypeScript)
- **SQLite** (로컬 파일 기반 DB: `data/clothpur.db`)
- **Drizzle ORM** + **better-sqlite3** (TypeScript ORM + SQLite 드라이버)
- **Drizzle Kit** (스키마 관리 및 마이그레이션)
- **NextAuth.js v5 (Auth.js)** (이메일/비밀번호 인증, CredentialsProvider)
- **bcryptjs** (비밀번호 해시)
- **shadcn/ui** (Tailwind CSS v4, radix-ui)
- **폼**: react-hook-form + zod
- **알림**: sonner (toast)

## GitHub 저장소

`https://github.com/lapiogga/clothpur.git`

# 폴더 구조

```
C:\Study_6\
├── data/
│   └── clothpur.db      # SQLite DB 파일 (Git 제외)
├── docs/                # 기획/설계 산출물
│   ├── functional-spec/ # 기능명세서
│   ├── screen-spec/     # 화면명세서
│   ├── architecture/    # 아키텍처 설계서
│   ├── db-design/       # DB 스키마 설계서
│   ├── api-spec/        # API 명세서
│   └── test-plan/       # 테스트 계획서
├── drizzle/             # Drizzle 마이그레이션 파일 (자동 생성)
├── actions/             # Server Actions (데이터 변경 로직)
├── app/                 # Next.js App Router 페이지
│   ├── (admin)/         # 군수담당자 페이지
│   ├── (auth)/          # 인증 페이지 (로그인, 비밀번호 변경 등)
│   ├── (store)/         # 피복판매소 담당자 페이지
│   ├── (tailor)/        # 체척업체 담당자 페이지
│   ├── (user)/          # 일반사용자 페이지
│   └── api/
│       └── auth/        # NextAuth.js API 라우트
├── components/          # 공통 컴포넌트
│   ├── forms/
│   ├── layout/
│   ├── shared/
│   ├── tables/
│   └── ui/              # shadcn/ui 기본 컴포넌트
├── lib/                 # 유틸리티 및 설정
│   ├── db.ts            # Drizzle ORM + better-sqlite3 연결
│   ├── auth.ts          # NextAuth.js v5 설정
│   ├── schema/          # Drizzle 스키마 정의 (TypeScript)
│   │   ├── users.ts
│   │   ├── stores.ts
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── points.ts
│   │   ├── inventory.ts
│   │   ├── tickets.ts
│   │   └── index.ts
│   ├── constants.ts     # 계급, 포인트 기준값
│   ├── menu-config.ts
│   └── utils.ts
├── middleware.ts         # NextAuth 세션 기반 역할 접근 제어
└── types/               # TypeScript 타입 정의
    ├── index.ts         # 비즈니스 타입
    └── next-auth.d.ts   # NextAuth 타입 확장
```

# 아키텍처 개요

## 라우팅 구조 (역할별 분리)

```
(admin)/    → /admin/...   군수담당자 (role: "admin")
(store)/    → /store/...   피복판매소 담당자 (role: "store")
(tailor)/   → /tailor/...  체척업체 담당자 (role: "tailor")
(user)/     → /my/...      일반사용자 (role: "user")
(auth)/     → /login, /forgot-password, /change-password 등
```

`src/middleware.ts`: NextAuth.js 세션에서 역할을 읽어 역할별 경로 접근 제어.
비인증 사용자는 `/`(로그인)로, 잘못된 역할로 접근 시 본인 역할 대시보드로 리다이렉트.

## DB 연결 (Drizzle ORM)

```typescript
// lib/db.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('data/clothpur.db')
export const db = drizzle(sqlite, { schema })
```

## 인증 (NextAuth.js v5)

```typescript
// lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
// CredentialsProvider로 이메일/비밀번호 로그인
// users 테이블 조회 → bcrypt.compare() 비밀번호 검증
// session에 role, store_id, tailor_id 포함
```

## Server Actions 패턴

모든 데이터 변경은 `src/actions/` 아래 Server Action으로 처리.
각 파일 상단에 `"use server"` 선언.
`auth()` (NextAuth)로 세션 확인 후 `db` (Drizzle)로 쿼리.

```typescript
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function someAction() {
  const session = await auth()
  if (!session) return { success: false, error: '인증이 필요합니다' }
  // ... Drizzle ORM 쿼리
}
```

**Server Action 반환 타입**: 모든 액션은 `{ success: boolean, error?: string }` 형태로 반환.

**데이터 변경 후 반드시 `revalidatePath()`를 호출**해 캐시를 무효화.

## 페이지 컴포넌트 패턴

- **Server Component (기본)**: 페이지에서 `db` 직접 쿼리 후 렌더링
- **Client Component**: 상태/이벤트 필요 시 `_components/` 폴더에 분리
- 예시: `store/dashboard/page.tsx` (Server) + `store/dashboard/_components/refresh-button.tsx` (Client)

## 레이아웃 구조

각 역할별 `layout.tsx`에서 `auth()`로 세션(사용자 정보) 가져와 `Header`에 전달.
`MENU_CONFIG`(lib/menu-config.ts)에서 역할별 메뉴 항목 관리.

# 핵심 도메인 로직

## 포인트 시스템
- **원장(ledger) 패턴**: `point_ledger` 테이블에 모든 변동 이력 기록
- **요약 테이블**: `point_summary` (total/used/reserved)
- **예약포인트**: 온라인 구매 시 `reserve` → 배송 완료 시 `deduct`+`release`로 확정
- 계급별 연간 지급액: `src/lib/constants.ts`의 `ANNUAL_POINTS`

## 재고 시스템
- `inventory` 테이블: 판매소(`store_id`) + 규격(`spec_id`) 단위로 관리
- 변동 이력: `inventory_log` (sale/incoming/return/adjust)

## 체척권 (맞춤피복)
- 주문 시 발행(`issued`) → 체척업체 등록(`registered`) → 취소요청/승인 가능
- 취소 승인은 군수담당자만 가능; 등록된 체척권은 반품 불가
- 재고 관리 없음 (체척업체에서 제작)

## 주문 테이블 통합
- `orders` 테이블: 온라인/오프라인 통합 (`order_type: "online" | "offline"`)
- `order_items`: 완제품(`finished`) + 맞춤피복(`custom`) 혼재 가능

## 트랜잭션 처리
SQLite는 동기 방식이므로 `better-sqlite3`의 `.transaction()` 메서드 사용:
```typescript
const processTransaction = db.transaction(() => {
  // 여러 테이블 갱신을 원자적으로 처리
})
processTransaction()
```

# 타입 시스템

- `types/index.ts`: 비즈니스 타입 (`UserRole`, `Rank`, `OrderStatus`, `TicketStatus` 등)
- `types/next-auth.d.ts`: NextAuth Session 타입 확장 (role, store_id, tailor_id 포함)
- Drizzle 스키마에서 `InferSelectModel`, `InferInsertModel`로 DB 타입 자동 추론

# UI 디자인 가이드

- **테마**: 정부/공공기관형 라이트 (흰색 배경, 감청색 Primary)
- **폰트**: Arial + Noto Sans KR (variable)
- **Button**: `rounded-[4px]`, 액션 버튼(수정/검색/추가/삭제)에 배경색 필수
- **Badge**: `rounded-[2px]`, 무채색 zinc 계열
- **헤더/품목관리 사이드바 배경**: 옅은 베이지 `#FAF7F2`
- **금액**: `text-right` + `font-variant-numeric: tabular-nums`

# DB 스키마 관리 (Drizzle)

스키마 정의: `lib/schema/*.ts` (TypeScript로 작성)
마이그레이션: `npm run db:generate` → `drizzle/` 폴더에 SQL 파일 생성 → `npm run db:migrate`로 적용

# 문서 산출물

`C:\Study_6\docs\` 아래 프로젝트 산출물 관리:
- `functional-spec/` 기능명세서
- `screen-spec/` 화면명세서
- `architecture/` 아키텍처 설계서
- `db-design/` DB 스키마 설계서
- `api-spec/` API 명세서
- `test-plan/` 테스트 계획서
- `test-data/` 테스트 데이터
- `test-result/` 테스트 결과

# 변경이력

| 날짜 | 버전 | 내용 | 작성자 |
|------|------|------|--------|
| 2026-03-04 | v1.0 | 최초 작성 (Supabase 기반) | project-manager |
| 2026-03-04 | v1.1 | DB 변경: Supabase → SQLite + Drizzle ORM + NextAuth.js | project-manager |
| 2026-03-05 | v1.2 | Next.js 프로젝트 초기화 완료, 폴더 구조 src/ → root-level로 변경, Team Agent + Forge 파이프라인 추가 | developer |
