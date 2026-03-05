# 피복 구매관리 시스템 - 기능명세서

| 항목 | 내용 |
|------|------|
| **문서번호** | FS-UNIFORM-2026-001 |
| **버전** | v1.0 |
| **작성일** | 2026-03-04 |
| **작성자** | 기획 담당자 (Planner) |
| **기준 문서** | SRS-UNIFORM-2026-001 (요구사항정의서 v1.0) |

---

## 1. 시스템 개요

### 1.1 목적
군 장병(장교, 부사관, 군무원)에게 계급별 피복포인트를 지급하고, 피복판매소를 통한 온라인/오프라인 구매, 재고관리, 체척권(맞춤피복) 관리를 통합 수행하는 웹 기반 구매관리 시스템.

### 1.2 범위
- 피복포인트 관리 (산정, 지급, 진급 추가, 일할계산)
- 온라인 구매 (품목 선택, 장바구니, 주문, 배송 추적)
- 오프라인 판매 (직접 판매, 반품 처리)
- 재고관리 (판매소별 품목/규격별 재고, 입고, 조정)
- 체척권 관리 (발행, 등록, 취소, 정산)
- 사용자/기초 데이터 관리

### 1.3 사용자 역할

| 역할 | 코드 | 설명 |
|------|------|------|
| 군수담당자 | `admin` | 시스템 전체 관리 |
| 피복판매소 담당자 | `store` | 판매/재고/배송 관리 |
| 체척업체 담당자 | `tailor` | 체척권 등록/정산 |
| 일반사용자 | `user` | 온라인 구매, 조회 |

---

## 2. 모듈 목록

| 모듈 ID | 모듈명 | 설명 | 주요 담당 역할 |
|---------|--------|------|---------------|
| M1 | 인증/권한 | 로그인, 비밀번호 관리, 역할별 접근 제어 | 모든 역할 |
| M2 | 사용자 관리 | 사용자 CRUD, 역할/소속 지정 | admin |
| M3 | 기초 데이터 관리 | 판매소, 체척업체, 메뉴 관리 | admin |
| M4 | 품목 관리 | 분류 3단계, 품목, 규격 CRUD | admin |
| M5 | 포인트 관리 | 산정, 지급, 진급, 퇴직, 현황/이력 조회 | admin, user |
| M6 | 주문/판매 관리 | 온라인 구매, 오프라인 판매, 반품, 재고, 배송, 통계 | user, store |
| M7 | 체척권/정산 관리 | 체척권 발행/등록/취소, 정산 처리 | admin, store, tailor, user |

---

## 3. 모듈별 기능 명세

### 3.1 M1: 인증/권한 모듈

#### F-M1-001: 로그인
- **기능 ID**: F-M1-001
- **기능명**: 이메일/비밀번호 로그인
- **접근 역할**: 공개 (비인증 사용자)
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| email | string | Y | 이메일 형식, 최대 255자 |
| password | string | Y | 최소 8자 |

- **처리 로직**:
  1. 이메일/비밀번호 유효성 검증
  2. Supabase Auth `signInWithPassword` 호출
  3. 인증 성공 시 users 테이블에서 role 조회
  4. 역할별 대시보드로 리다이렉트:
     - admin -> `/admin/dashboard`
     - store -> `/store/dashboard`
     - tailor -> `/tailor/dashboard`
     - user -> `/my/shop`
- **출력 데이터**: 리다이렉트 (성공), 에러 메시지 (실패)
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| AUTH_INVALID | 이메일 또는 비밀번호가 올바르지 않습니다 | 인증 실패 |
| VALIDATION | 이메일 형식이 올바르지 않습니다 | 이메일 형식 오류 |

- **관련 규칙**: -

#### F-M1-002: 로그아웃
- **기능 ID**: F-M1-002
- **기능명**: 로그아웃
- **접근 역할**: 인증된 모든 역할
- **입력 데이터**: 없음
- **처리 로직**:
  1. Supabase Auth `signOut` 호출
  2. 세션 쿠키 제거
  3. 로그인 페이지(`/`)로 리다이렉트
- **출력 데이터**: 리다이렉트
- **예외 처리**: 없음

#### F-M1-003: 비밀번호 찾기
- **기능 ID**: F-M1-003
- **기능명**: 비밀번호 재설정 링크 발송
- **접근 역할**: 공개
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| email | string | Y | 이메일 형식 |

- **처리 로직**:
  1. 이메일 유효성 검증
  2. Supabase Auth `resetPasswordForEmail` 호출
  3. 발송 완료 메시지 표시 (이메일 존재 여부 무관하게 동일 메시지)
- **출력 데이터**: 발송 완료 안내 메시지
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| VALIDATION | 이메일 형식이 올바르지 않습니다 | 이메일 형식 오류 |

#### F-M1-004: 비밀번호 변경
- **기능 ID**: F-M1-004
- **기능명**: 비밀번호 변경
- **접근 역할**: 인증된 모든 역할
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| password | string | Y | 최소 8자 |
| confirmPassword | string | Y | password와 일치 |

- **처리 로직**:
  1. 비밀번호 유효성 검증 (최소 8자, 확인 필드 일치)
  2. Supabase Auth `updateUser({ password })` 호출
  3. 성공 메시지 표시
- **출력 데이터**: 성공/실패 메시지
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| VALIDATION | 비밀번호는 최소 8자 이상이어야 합니다 | 8자 미만 |
| VALIDATION | 비밀번호가 일치하지 않습니다 | 확인 불일치 |

#### F-M1-005: 현재 사용자 조회
- **기능 ID**: F-M1-005
- **기능명**: 로그인한 사용자 정보 조회
- **접근 역할**: 인증된 모든 역할
- **입력 데이터**: 없음 (세션 기반)
- **처리 로직**:
  1. `supabase.auth.getUser()`로 인증 확인
  2. users 테이블에서 사용자 정보 조회 (stores, tailors 관계 포함)
  3. store 역할: store_id 기반 stores 조인
  4. tailor 역할: tailor_id 기반 tailors 조인
- **출력 데이터**: User 객체 (id, email, name, role, rank, store_id, tailor_id 등)
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| AUTH_INVALID | 인증이 필요합니다 | 미인증 |
| NOT_FOUND | 사용자 정보를 찾을 수 없습니다 | users 테이블 미존재 |

#### F-M1-006: 미들웨어 경로 보호
- **기능 ID**: F-M1-006
- **기능명**: 역할별 경로 접근 제어
- **접근 역할**: 시스템
- **처리 로직**:
  1. 요청 경로와 세션 확인
  2. 비인증 사용자가 보호된 경로 접근 시 `/`로 리다이렉트
  3. 인증 사용자가 권한 없는 경로 접근 시 본인 역할 대시보드로 리다이렉트
  4. 경로별 허용 역할:
     - `/admin/**` -> admin만
     - `/store/**` -> store만
     - `/tailor/**` -> tailor만
     - `/my/**` -> user만

---

### 3.2 M2: 사용자 관리 모듈

#### F-M2-001: 사용자 목록 조회
- **기능 ID**: F-M2-001
- **기능명**: 사용자 목록 조회
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| search | string | N | 이름 또는 군번 검색 |
| role | string | N | admin/store/tailor/user |
| rank | string | N | 계급 코드 |
| page | number | N | 기본값 1, 양수 |
| pageSize | number | N | 기본값 20 |

- **처리 로직**:
  1. 인증 확인 + admin 역할 검증
  2. users 테이블에서 필터 조건 적용하여 조회
  3. 서버사이드 페이지네이션 (페이지당 20건)
  4. stores, tailors 테이블 조인 (소속 정보)
- **출력 데이터**: { users: User[], totalCount: number, page: number }
- **예외 처리**: AUTH_INVALID

#### F-M2-002: 사용자 개별 등록
- **기능 ID**: F-M2-002
- **기능명**: 사용자 개별 등록
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| name | string | Y | 최대 50자 |
| email | string | Y | 이메일 형식, 최대 255자, 중복 불가 |
| role | string | Y | admin/store/tailor/user 중 하나 |
| rank | string | 조건부 | user 역할 시 필수, 12종 계급 중 하나 |
| military_number | string | N | 최대 30자 |
| unit | string | N | 최대 100자 |
| enlist_date | date | N | 날짜 형식 |
| promotion_date | date | N | 날짜 형식 |
| retirement_date | date | N | 미래 날짜 |
| store_id | uuid | 조건부 | store 역할 시 필수 |
| tailor_id | uuid | 조건부 | tailor 역할 시 필수 |

- **처리 로직**:
  1. 인증 확인 + admin 역할 검증
  2. 입력 유효성 검증 (zod 스키마)
  3. 이메일 중복 확인
  4. store 역할: store_id 필수 검증, tailor 역할: tailor_id 필수 검증 (BR: REQ-A-005)
  5. Supabase Auth 사용자 생성 (`admin` 클라이언트 사용, RLS 우회)
  6. users 테이블에 사용자 정보 저장
  7. point_summary 초기 레코드 생성 (total=0, used=0, reserved=0)
- **출력 데이터**: { success: true, user_id: uuid }
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| AUTH_INVALID | 인증이 필요합니다 | 미인증/비관리자 |
| DUPLICATE_EMAIL | 이미 사용 중인 이메일입니다 | 이메일 중복 |
| VALIDATION | 필수 항목을 입력해주세요 | 필수 필드 누락 |
| VALIDATION | store 역할은 소속 판매소를 지정해야 합니다 | store_id 누락 |
| VALIDATION | tailor 역할은 소속 업체를 지정해야 합니다 | tailor_id 누락 |

- **관련 규칙**: REQ-A-002, REQ-A-005

#### F-M2-003: 사용자 일괄 등록
- **기능 ID**: F-M2-003
- **기능명**: CSV 파일 일괄 사용자 등록
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| file | File (CSV) | Y | CSV 형식, UTF-8 |

- **처리 로직**:
  1. 인증 확인 + admin 역할 검증
  2. CSV 파일 파싱 (name, email, role, rank, military_number, unit, enlist_date 등)
  3. 각 행별 유효성 검사
  4. 유효한 행에 대해 F-M2-002 개별 등록 반복 수행
  5. 성공/실패 건수 집계
- **출력 데이터**: { success: true, total: number, succeeded: number, failed: number, errors: Error[] }
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| VALIDATION | CSV 형식이 올바르지 않습니다 | 파싱 실패 |

#### F-M2-004: 사용자 정보 수정
- **기능 ID**: F-M2-004
- **기능명**: 사용자 정보 수정
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| id | uuid | Y | 존재하는 사용자 |
| name | string | Y | 최대 50자 |
| rank | string | 조건부 | user 역할 시 필수 |
| unit | string | N | 최대 100자 |
| promotion_date | date | 조건부 | 계급 변경 시 필수 |
| retirement_date | date | N | 날짜 형식 |
| is_active | boolean | N | |
| store_id | uuid | 조건부 | store 역할 시 |
| tailor_id | uuid | 조건부 | tailor 역할 시 |

- **처리 로직**:
  1. 인증 확인 + admin 역할 검증
  2. 사용자 존재 확인
  3. 계급 변경 시 promotion_date 필수 검증
  4. users 테이블 업데이트
  5. 계급 변경 시: 진급 포인트 추가 트리거 (BR-006 적용, F-M5-003 호출)
  6. 퇴직예정일 변경 시: 포인트 차감 트리거 (BR-007 적용, F-M5-006 호출)
  7. `revalidatePath()` 호출
- **출력 데이터**: { success: true }
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| NOT_FOUND | 사용자를 찾을 수 없습니다 | 미존재 |
| VALIDATION | 계급 변경 시 진급일을 입력해야 합니다 | promotion_date 누락 |

- **관련 규칙**: BR-006, BR-007

#### F-M2-005: 사용자 상세 조회
- **기능 ID**: F-M2-005
- **기능명**: 사용자 상세 정보 조회
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| id | uuid | Y |

- **처리 로직**:
  1. 인증 확인 + admin 역할 검증
  2. users 테이블에서 id로 조회 (stores, tailors 조인)
  3. point_summary 조인하여 포인트 요약 포함
- **출력 데이터**: User 객체 (포인트 요약 포함)
- **예외 처리**: NOT_FOUND

---

### 3.3 M3: 기초 데이터 관리 모듈

#### F-M3-001: 판매소 목록 조회
- **기능 ID**: F-M3-001
- **기능명**: 판매소 목록 조회
- **접근 역할**: admin (전체), store/tailor/user (활성 판매소만)
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| search | string | N |
| is_active | boolean | N |

- **처리 로직**:
  1. 인증 확인
  2. stores 테이블 조회 (검색, 필터 적용)
- **출력 데이터**: Store[]

#### F-M3-002: 판매소 등록
- **기능 ID**: F-M3-002
- **기능명**: 판매소 등록
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| name | string | Y | 최대 100자 |
| address | string | N | 최대 200자 |
| phone | string | N | 전화번호 형식 |
| manager | string | N | 최대 50자 |
| is_active | boolean | N | 기본값 true |

- **처리 로직**:
  1. 인증 확인 + admin 역할 검증
  2. 입력 유효성 검증
  3. stores 테이블에 INSERT
  4. `revalidatePath()` 호출
- **출력 데이터**: { success: true }

#### F-M3-003: 판매소 수정
- **기능 ID**: F-M3-003
- **기능명**: 판매소 정보 수정
- **접근 역할**: admin
- **입력 데이터**: F-M3-002와 동일 + id(uuid, 필수)
- **처리 로직**:
  1. 인증 확인 + admin 역할 검증
  2. 판매소 존재 확인
  3. stores 테이블 UPDATE
  4. `revalidatePath()` 호출
- **출력 데이터**: { success: true }
- **예외 처리**: NOT_FOUND

#### F-M3-004: 판매소 삭제
- **기능 ID**: F-M3-004
- **기능명**: 판매소 삭제
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| id | uuid | Y |

- **처리 로직**:
  1. 인증 확인 + admin 역할 검증
  2. 소속 사용자 존재 여부 확인 -> 있으면 삭제 불가 (비활성만 가능)
  3. 관련 재고 존재 여부 확인 -> 있으면 삭제 불가
  4. 조건 통과 시 stores 테이블 DELETE
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| HAS_CHILDREN | 소속 사용자가 존재하여 삭제할 수 없습니다 | 사용자 존재 |
| HAS_INVENTORY | 관련 재고가 존재하여 삭제할 수 없습니다 | 재고 존재 |

#### F-M3-005: 체척업체 목록 조회
- **기능 ID**: F-M3-005
- **기능명**: 체척업체 목록 조회
- **접근 역할**: admin (전체), store/tailor/user (활성 업체만)
- **처리 로직**: tailors 테이블 조회
- **출력 데이터**: Tailor[]

#### F-M3-006: 체척업체 등록
- **기능 ID**: F-M3-006
- **기능명**: 체척업체 등록
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| name | string | Y | 최대 100자 |
| business_number | string | N | 사업자번호 형식 |
| representative | string | N | 최대 50자 |
| address | string | N | 최대 200자 |
| phone | string | N | 전화번호 형식 |
| bank_name | string | N | 최대 50자 |
| account_number | string | N | 최대 50자 |
| account_holder | string | N | 최대 50자 |
| is_active | boolean | N | 기본값 true |

- **처리 로직**: 유효성 검증 -> tailors INSERT -> revalidatePath
- **출력 데이터**: { success: true }

#### F-M3-007: 체척업체 수정
- **기능 ID**: F-M3-007
- **기능명**: 체척업체 정보 수정
- **접근 역할**: admin
- **처리 로직**: F-M3-006 입력 + id 기반 UPDATE
- **예외 처리**: NOT_FOUND

#### F-M3-008: 체척업체 삭제
- **기능 ID**: F-M3-008
- **기능명**: 체척업체 삭제
- **접근 역할**: admin
- **처리 로직**:
  1. 등록된 체척권 존재 여부 확인
  2. 없으면 DELETE, 있으면 삭제 불가
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| HAS_CHILDREN | 등록된 체척권이 존재하여 삭제할 수 없습니다 | 체척권 존재 |

#### F-M3-009: 메뉴 목록 조회
- **기능 ID**: F-M3-009
- **기능명**: 메뉴 목록 조회
- **접근 역할**: admin (전체), 기타 역할 (자기 역할 메뉴만)
- **처리 로직**: menus 테이블 조회 (계층 구조), 역할 필터 적용
- **출력 데이터**: Menu[] (트리 구조)

#### F-M3-010: 메뉴 등록
- **기능 ID**: F-M3-010
- **기능명**: 메뉴 등록
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| name | string | Y | 최대 50자 |
| url | string | N | URL 경로 형식 |
| parent_id | uuid | N | 상위 메뉴 (없으면 최상위) |
| sort_order | number | N | 정렬 순서 |
| roles | string[] | Y | 접근 가능 역할 (복수 선택) |
| is_active | boolean | N | 기본값 true |

- **처리 로직**: 유효성 검증 -> menus INSERT -> revalidatePath
- **출력 데이터**: { success: true }

#### F-M3-011: 메뉴 수정
- **기능 ID**: F-M3-011
- **기능명**: 메뉴 수정
- **접근 역할**: admin
- **처리 로직**: F-M3-010 입력 + id 기반 UPDATE

#### F-M3-012: 메뉴 삭제
- **기능 ID**: F-M3-012
- **기능명**: 메뉴 삭제
- **접근 역할**: admin
- **처리 로직**: 하위 메뉴 존재 확인 -> 없으면 DELETE
- **예외 처리**: HAS_CHILDREN

#### F-M3-013: 배송지 목록 조회
- **기능 ID**: F-M3-013
- **기능명**: 배송지 목록 조회
- **접근 역할**: store (자기 판매소), user (활성 배송지만)
- **처리 로직**: delivery_zones 테이블에서 store_id 기반 조회
- **출력 데이터**: DeliveryZone[]

#### F-M3-014: 배송지 등록
- **기능 ID**: F-M3-014
- **기능명**: 배송지 등록
- **접근 역할**: store
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| name | string | Y | 최대 100자 |
| address | string | Y | 최대 200자 |
| note | string | N | 비고 |
| is_active | boolean | N | 기본값 true |

- **처리 로직**: 로그인 사용자의 store_id 기반 -> delivery_zones INSERT
- **출력 데이터**: { success: true }

#### F-M3-015: 배송지 수정
- **기능 ID**: F-M3-015
- **기능명**: 배송지 수정
- **접근 역할**: store (자기 판매소 배송지만)
- **처리 로직**: 소속 판매소 검증 -> UPDATE

#### F-M3-016: 배송지 삭제
- **기능 ID**: F-M3-016
- **기능명**: 배송지 삭제
- **접근 역할**: store (자기 판매소 배송지만)
- **처리 로직**: 소속 판매소 검증 -> DELETE

---

### 3.4 M4: 품목 관리 모듈

#### F-M4-001: 분류 목록 조회
- **기능 ID**: F-M4-001
- **기능명**: 품목 분류 3단계 트리 조회
- **접근 역할**: admin (전체), store/user (활성 분류만)
- **처리 로직**:
  1. categories 테이블 조회 (level 1/2/3)
  2. 자기참조 관계로 트리 구조 구성
  3. parent_id 기반 계층 정렬
- **출력 데이터**: Category[] (대분류 > 중분류 > 소분류 트리)
- **관련 규칙**: BR-017

#### F-M4-002: 분류 등록
- **기능 ID**: F-M4-002
- **기능명**: 품목 분류 등록
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| name | string | Y | 최대 100자 |
| parent_id | uuid | 조건부 | level 2,3일 때 필수 |
| level | number | Y | 1, 2, 3 중 하나 |
| sort_order | number | N | 정렬 순서 |
| is_active | boolean | N | 기본값 true |

- **처리 로직**:
  1. level과 parent_id 정합성 검증 (level 1: parent_id null, level 2: parent_id=level1, level 3: parent_id=level2)
  2. categories INSERT
- **출력 데이터**: { success: true }
- **관련 규칙**: BR-017

#### F-M4-003: 분류 수정
- **기능 ID**: F-M4-003
- **기능명**: 품목 분류 수정
- **접근 역할**: admin
- **처리 로직**: 존재 확인 -> UPDATE

#### F-M4-004: 분류 삭제
- **기능 ID**: F-M4-004
- **기능명**: 품목 분류 삭제
- **접근 역할**: admin
- **처리 로직**:
  1. 하위 분류 존재 여부 확인
  2. 소속 품목 존재 여부 확인
  3. 모두 없으면 DELETE
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| HAS_CHILDREN | 하위 분류가 존재하여 삭제할 수 없습니다 | 하위 분류 존재 |
| HAS_CHILDREN | 소속 품목이 존재하여 삭제할 수 없습니다 | 품목 존재 |

#### F-M4-005: 품목 목록 조회
- **기능 ID**: F-M4-005
- **기능명**: 품목 목록 조회
- **접근 역할**: admin (전체), store/user (활성 품목만)
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| category_id | uuid | N |
| product_type | string | N |
| search | string | N |
| is_active | boolean | N |

- **처리 로직**: products 테이블 조회 (categories 조인, 필터 적용)
- **출력 데이터**: Product[] (분류 정보 포함)

#### F-M4-006: 품목 등록
- **기능 ID**: F-M4-006
- **기능명**: 품목 등록
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| name | string | Y | 최대 100자 |
| category_l1_id | uuid | Y | 대분류 |
| category_l2_id | uuid | Y | 중분류 (대분류 하위) |
| category_l3_id | uuid | Y | 소분류 (중분류 하위) |
| product_type | string | Y | finished/custom |
| price | number | Y | 양수 |
| image_url | string | N | URL 형식 |
| description | text | N | |
| is_active | boolean | N | 기본값 true |

- **처리 로직**:
  1. 분류 계층 정합성 검증 (대 > 중 > 소 관계)
  2. products INSERT
- **출력 데이터**: { success: true }
- **관련 규칙**: BR-010, BR-017

#### F-M4-007: 품목 수정
- **기능 ID**: F-M4-007
- **기능명**: 품목 수정
- **접근 역할**: admin
- **처리 로직**: 존재 확인 -> UPDATE

#### F-M4-008: 품목 삭제
- **기능 ID**: F-M4-008
- **기능명**: 품목 삭제
- **접근 역할**: admin
- **처리 로직**: 관련 주문/재고 확인 -> 없으면 DELETE
- **예외 처리**: HAS_CHILDREN, HAS_INVENTORY

#### F-M4-009: 규격 목록 조회
- **기능 ID**: F-M4-009
- **기능명**: 품목 규격(사이즈) 목록 조회
- **접근 역할**: admin, store, user
- **입력 데이터**: product_id (uuid, 필수)
- **처리 로직**: product_specs 테이블에서 product_id 기반 조회 (완제품만)
- **출력 데이터**: ProductSpec[]
- **관련 규칙**: BR-024 (맞춤피복은 규격 없음)

#### F-M4-010: 규격 등록
- **기능 ID**: F-M4-010
- **기능명**: 품목 규격 등록
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| product_id | uuid | Y | 완제품(finished)인 품목만 |
| name | string | Y | 규격명 (95, 100, 105 등) |
| sort_order | number | N | 정렬 순서 |
| is_active | boolean | N | 기본값 true |

- **처리 로직**:
  1. 품목이 완제품(finished)인지 확인
  2. 맞춤피복이면 등록 불가
  3. product_specs INSERT
- **출력 데이터**: { success: true }
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| INVALID_PRODUCT_TYPE | 맞춤피복은 규격을 등록할 수 없습니다 | custom 품목 |

- **관련 규칙**: BR-023, BR-024

#### F-M4-011: 규격 수정
- **기능 ID**: F-M4-011
- **기능명**: 규격 수정
- **접근 역할**: admin
- **처리 로직**: UPDATE

#### F-M4-012: 규격 삭제
- **기능 ID**: F-M4-012
- **기능명**: 규격 삭제
- **접근 역할**: admin
- **처리 로직**: 재고 존재 확인 -> 없으면 DELETE
- **예외 처리**: HAS_INVENTORY

---

### 3.5 M5: 포인트 관리 모듈

#### F-M5-001: 포인트 산정 (미리보기)
- **기능 ID**: F-M5-001
- **기능명**: 연간 포인트 산정 미리보기
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| fiscal_year | number | Y | 4자리 연도 |

- **처리 로직**:
  1. 인증 확인 + admin 역할 검증
  2. 전체 활성 사용자(role='user') 조회
  3. 각 사용자별 포인트 산정:
     a. 계급별 기본 금액 (BR-004)
     b. 호봉 추가: (fiscal_year - 입대연도) x 5,000원 (BR-005)
     c. 퇴직예정자 일할계산: 기본금액 x (1/1~퇴직예정일 일수) / 365 (BR-007)
  4. DB 변경 없이 산정 결과만 반환
- **출력 데이터**: { users: [{user_id, name, rank, base_amount, seniority_bonus, prorated_amount, total}], grand_total: number }
- **관련 규칙**: BR-003, BR-004, BR-005, BR-007

#### F-M5-002: 포인트 일괄 지급
- **기능 ID**: F-M5-002
- **기능명**: 연간 포인트 일괄 지급
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| fiscal_year | number | Y |

- **처리 로직**:
  1. 해당 연도 이미 지급 여부 확인 (BR-003, BR-012)
  2. 중복이면 에러 반환
  3. F-M5-001 산정 로직 실행
  4. 각 사용자별:
     a. point_ledger INSERT (type='grant', fiscal_year)
     b. point_summary.total_points 갱신
  5. `revalidatePath()` 호출
- **출력 데이터**: { success: true, count: number, total_amount: number }
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| ALREADY_GRANTED | 해당 연도에 이미 포인트가 지급되었습니다 | 중복 지급 |

- **관련 규칙**: BR-003, BR-004, BR-005, BR-007, BR-012

#### F-M5-003: 진급 포인트 추가
- **기능 ID**: F-M5-003
- **기능명**: 진급 시 차액 일할계산 추가 지급
- **접근 역할**: admin (사용자 수정 시 자동 트리거)
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| user_id | uuid | Y |
| old_rank | string | Y |
| new_rank | string | Y |
| promotion_date | date | Y |

- **처리 로직**:
  1. 잔여일수 = 진급일 ~ 12월 31일
  2. 신계급 일일금액 = 신계급 연간 포인트 / 365
  3. 구계급 일일금액 = 구계급 연간 포인트 / 365
  4. 추가금액 = (신계급 일일금액 - 구계급 일일금액) x 잔여일수
  5. 추가금액 > 0이면:
     a. point_ledger INSERT (type='add', description='진급 추가 지급')
     b. point_summary.total_points 증가
- **출력 데이터**: { success: true, added_amount: number }
- **관련 규칙**: BR-006

#### F-M5-004: 포인트 현황 조회
- **기능 ID**: F-M5-004
- **기능명**: 전체 사용자 포인트 현황 조회
- **접근 역할**: admin (전체), user (본인만)
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| search | string | N |
| rank | string | N |
| page | number | N |

- **처리 로직**: point_summary 테이블 + users 조인 조회
- **출력 데이터**: { summaries: [{user_id, name, rank, total_points, used_points, reserved_points, available_points}] }
- **관련 규칙**: BR-001

#### F-M5-005: 포인트 변동 이력 조회
- **기능 ID**: F-M5-005
- **기능명**: 사용자별 포인트 변동 이력 조회
- **접근 역할**: admin (전체), user (본인만)
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| user_id | uuid | Y |
| point_type | string | N |
| start_date | date | N |
| end_date | date | N |

- **처리 로직**: point_ledger 테이블에서 user_id 기반 시간순 조회
- **출력 데이터**: PointLedger[]

#### F-M5-006: 퇴직예정자 포인트 차감
- **기능 ID**: F-M5-006
- **기능명**: 퇴직예정일 변경 시 포인트 차감
- **접근 역할**: admin (사용자 수정 시 자동 트리거)
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| user_id | uuid | Y |
| retirement_date | date | Y |

- **처리 로직**:
  1. 잔여기간 = 1/1 ~ 퇴직예정일 일수
  2. 일할금액 = 연간 포인트 x 잔여기간 / 365
  3. 차감금액 = 연간 포인트 - 일할금액
  4. 차감금액 > 0이면:
     a. point_ledger INSERT (type='deduct', description='퇴직예정 포인트 차감')
     b. point_summary.total_points 감소
- **출력 데이터**: { success: true, deducted_amount: number }
- **관련 규칙**: BR-007

#### F-M5-007: 가용포인트 조회
- **기능 ID**: F-M5-007
- **기능명**: 사용자 가용포인트 조회
- **접근 역할**: 인증된 모든 역할
- **입력 데이터**: user_id (uuid)
- **처리 로직**:
  1. point_summary에서 조회
  2. 가용포인트 = total_points - used_points - reserved_points
- **출력 데이터**: { available_points: number, total_points, used_points, reserved_points }
- **관련 규칙**: BR-001

#### F-M5-008: 포인트 임의 변경
- **기능 ID**: F-M5-008
- **기능명**: 포인트 임의 추가/차감
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| user_id | uuid | Y | 존재하는 사용자 |
| point_type | string | Y | add/deduct |
| amount | number | Y | 양수 |
| description | string | Y | 사유 |

- **처리 로직**:
  1. 인증 확인 + admin 역할 검증
  2. 사용자 존재 확인
  3. deduct 시 가용포인트 충분 여부 확인
  4. point_ledger INSERT
  5. point_summary 갱신
- **출력 데이터**: { success: true }
- **예외 처리**: INSUFFICIENT_POINTS (차감 시)

---

### 3.6 M6: 주문/판매 관리 모듈

#### F-M6-001: 오프라인 판매 등록
- **기능 ID**: F-M6-001
- **기능명**: 오프라인 완제품/맞춤피복 판매
- **접근 역할**: store
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| user_id | uuid | Y | 검색으로 선택 |
| product_type | string | Y | finished/custom |
| items | array | Y | 품목별 {product_id, spec_id, quantity, price} |

- **처리 로직 (완제품 - REQ-S-002)**:
  1. 사용자 검색(군번/이름) -> 가용포인트 확인
  2. 각 품목에 대해:
     a. 재고 확인 (재고 부족 시 판매 불가 - BR-014)
     b. 총 금액 산출
  3. 가용포인트 >= 총 금액 검증 (BR-002)
  4. 트랜잭션:
     a. orders INSERT (order_type='offline', status='delivered')
     b. order_items INSERT
     c. inventory 재고 차감
     d. inventory_log INSERT (type='sale')
     e. point_ledger INSERT (type='deduct')
     f. point_summary 갱신 (used_points 증가)
- **처리 로직 (맞춤피복 - REQ-S-003)**:
  1. 수량 1 고정 (BR-011)
  2. 재고 확인 불필요 (BR-012)
  3. 트랜잭션:
     a. orders INSERT (order_type='offline', status='delivered')
     b. order_items INSERT
     c. tailoring_tickets INSERT (status='issued') - 체척권 자동 발행 (BR-030)
     d. point_ledger INSERT (type='deduct')
     e. point_summary 갱신
- **출력 데이터**: { success: true, order_id: uuid }
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| INSUFFICIENT_POINTS | 가용포인트가 부족합니다 | 포인트 부족 |
| INSUFFICIENT_STOCK | 재고가 부족합니다 | 재고 부족(완제품) |
| NOT_FOUND | 사용자를 찾을 수 없습니다 | 사용자 미존재 |

- **관련 규칙**: BR-002, BR-010, BR-011, BR-012, BR-013, BR-014, BR-030

#### F-M6-002: 온라인 주문 생성
- **기능 ID**: F-M6-002
- **기능명**: 온라인 구매 주문 생성
- **접근 역할**: user
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| product_type | string | Y | finished/custom |
| store_id | uuid | 조건부 | 완제품 시 필수 (BR-015), 맞춤피복 시 불필요 (BR-016) |
| items | array | Y | {product_id, spec_id, quantity} |
| delivery_method | string | 조건부 | 완제품: parcel/direct 필수, 맞춤피복: 불필요 (BR-023) |
| delivery_address | string | 조건부 | 택배 시 필수 |
| delivery_zone_id | uuid | 조건부 | 직접배송 시 필수 |

- **처리 로직**:
  1. 인증 확인 + user 역할 검증
  2. 가용포인트 확인 (BR-001, BR-002)
  3. 완제품: 판매소 재고 확인 (BR-015)
  4. 트랜잭션:
     a. orders INSERT (order_type='online', status='pending')
     b. order_items INSERT
     c. point_ledger INSERT (type='reserve') - 예약포인트
     d. point_summary.reserved_points 증가
     e. 맞춤피복: tailoring_tickets INSERT (status='issued') - BR-030
- **출력 데이터**: { success: true, order_id: uuid, order_number: string }
- **예외 처리**: INSUFFICIENT_POINTS, INSUFFICIENT_STOCK
- **관련 규칙**: BR-001, BR-002, BR-010, BR-015, BR-016, BR-023, BR-030

#### F-M6-003: 구매 취소
- **기능 ID**: F-M6-003
- **기능명**: 온라인 주문 사용자 취소
- **접근 역할**: user
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| order_id | uuid | Y |

- **처리 로직**:
  1. 주문 조회 + 본인 주문 확인
  2. 배송 확정(delivered) 전 상태인지 확인 (BR-020)
  3. orders.status -> 'cancelled'
  4. point_ledger INSERT (type='release') - 예약포인트 해제
  5. point_summary.reserved_points 감소
  6. 맞춤피복: 미등록(issued) 체척권 취소 (tailoring_tickets.status -> 'cancelled')
- **출력 데이터**: { success: true }
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| INVALID_STATUS | 배송 확정된 주문은 취소할 수 없습니다 | delivered 상태 |
| INVALID_STATUS | 이미 취소된 주문입니다 | cancelled 상태 |

- **관련 규칙**: BR-020

#### F-M6-004: 직권 취소
- **기능 ID**: F-M6-004
- **기능명**: 판매소 직권 주문 취소
- **접근 역할**: store
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| order_id | uuid | Y |
| cancel_reason | string | Y |

- **처리 로직**:
  1. 주문 조회 + 자기 판매소 주문 확인
  2. 배송 확정 전 상태 확인 (pending 또는 confirmed만)
  3. orders.status -> 'cancelled', cancel_reason 기록
  4. 예약포인트 해제 (F-M6-003과 동일)
- **출력 데이터**: { success: true }
- **예외 처리**: INVALID_STATUS

#### F-M6-005: 온라인 주문 목록 조회
- **기능 ID**: F-M6-005
- **기능명**: 온라인 주문 목록 조회
- **접근 역할**: store (자기 판매소), user (본인 주문)
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| status | string | N |
| start_date | date | N |
| end_date | date | N |
| search | string | N |
| page | number | N |

- **처리 로직**: orders 테이블 조회 (order_type='online', 필터 적용, order_items 조인)
- **출력 데이터**: { orders: Order[], totalCount: number }

#### F-M6-006: 주문 상태 변경
- **기능 ID**: F-M6-006
- **기능명**: 온라인 주문 상태 전이
- **접근 역할**: store
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| order_id | uuid | Y |
| new_status | string | Y |

- **처리 로직**:
  1. 현재 상태 확인
  2. 상태 전이 규칙 검증:
     - pending -> confirmed
     - confirmed -> shipping
     - shipping -> delivered
  3. 유효한 전이가 아니면 에러
  4. orders.status UPDATE
  5. delivered로 변경 시 배송 완료 확정 처리 (F-M6-007 호출)
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| INVALID_STATUS_TRANSITION | 허용되지 않는 상태 변경입니다 | 규칙 위반 |

#### F-M6-007: 배송 완료 확정
- **기능 ID**: F-M6-007
- **기능명**: 배송 완료 시 재고/포인트 확정 처리
- **접근 역할**: store (F-M6-006에서 자동 호출)
- **처리 로직**:
  1. 완제품인 경우:
     a. inventory 재고 차감
     b. inventory_log INSERT (type='sale')
  2. point_ledger INSERT (type='deduct') - 사용 확정
  3. point_ledger INSERT (type='release') - 예약 해제
  4. point_summary 갱신:
     - used_points 증가
     - reserved_points 감소
- **관련 규칙**: BR-002

#### F-M6-008: 반품 처리 (완제품)
- **기능 ID**: F-M6-008
- **기능명**: 완제품 반품 처리
- **접근 역할**: store
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| order_id | uuid | Y |
| items | array | Y | {order_item_id, quantity} |

- **처리 로직**:
  1. 주문 조회 (delivered 상태, 오프라인만)
  2. 반품 항목/수량 확인
  3. 트랜잭션:
     a. order_items 상태 -> 'returned'
     b. inventory 재고 추가
     c. inventory_log INSERT (type='return')
     d. point_ledger INSERT (type='add') - 포인트 반환
     e. point_summary.used_points 감소
- **출력 데이터**: { success: true }
- **관련 규칙**: BR-021

#### F-M6-009: 반품 처리 (맞춤피복)
- **기능 ID**: F-M6-009
- **기능명**: 맞춤피복 반품 처리
- **접근 역할**: store
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| order_id | uuid | Y |
| order_item_id | uuid | Y |

- **처리 로직**:
  1. 체척권 상태 확인: 'issued'(미등록)인 경우만 반품 가능 (BR-033)
  2. 등록된(registered) 체척권은 반품 불가
  3. 트랜잭션:
     a. order_items 상태 -> 'returned'
     b. tailoring_tickets.status -> 'cancelled'
     c. point_ledger INSERT (type='add') - 포인트 반환
     d. point_summary.used_points 감소
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| TICKET_REGISTERED | 등록된 체척권은 반품할 수 없습니다 | registered 상태 |

- **관련 규칙**: BR-031, BR-033

#### F-M6-010: 주문 상세 조회
- **기능 ID**: F-M6-010
- **기능명**: 주문 상세 정보 조회
- **접근 역할**: store (자기 판매소), user (본인), admin
- **입력 데이터**: order_id (uuid)
- **처리 로직**: orders + order_items + products + tailoring_tickets 조인 조회
- **출력 데이터**: Order (상세 정보, 품목 목록, 체척권 정보 포함)

#### F-M6-011: 판매 내역 조회
- **기능 ID**: F-M6-011
- **기능명**: 오프라인 판매 내역 조회
- **접근 역할**: store
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| start_date | date | N |
| end_date | date | N |
| search | string | N |
| product_type | string | N |

- **처리 로직**: orders 테이블 조회 (order_type='offline', 자기 판매소)
- **출력 데이터**: Order[]

#### F-M6-012: 재고 현황 조회
- **기능 ID**: F-M6-012
- **기능명**: 판매소별 재고 현황 조회
- **접근 역할**: store (자기 판매소), admin (전체)
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| store_id | uuid | 조건부 |
| category_id | uuid | N |
| search | string | N |

- **처리 로직**:
  1. inventory 테이블 조회 (products, product_specs 조인)
  2. 재고 부족(<=5) 항목 하이라이트 표시
- **출력 데이터**: Inventory[]
- **관련 규칙**: BR-013

#### F-M6-013: 입고 처리
- **기능 ID**: F-M6-013
- **기능명**: 재고 입고 처리
- **접근 역할**: store
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| product_id | uuid | Y | 완제품만 |
| spec_id | uuid | Y | 해당 품목 규격 |
| quantity | number | Y | 양수 |

- **처리 로직**:
  1. 자기 판매소 store_id 확인
  2. inventory에 해당 품목+규격 레코드 존재 확인 (없으면 생성)
  3. inventory.quantity 증가
  4. inventory_log INSERT (type='incoming')
- **출력 데이터**: { success: true }

#### F-M6-014: 재고 조정
- **기능 ID**: F-M6-014
- **기능명**: 재고 조정 (증가/감소)
- **접근 역할**: store
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| product_id | uuid | Y | |
| spec_id | uuid | Y | |
| adjustment | number | Y | 양수 또는 음수 |
| reason | string | Y | 사유 |

- **처리 로직**:
  1. 조정 후 수량 >= 0 검증
  2. inventory.quantity 변경
  3. inventory_log INSERT (type='adjust_up' 또는 'adjust_down')
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| NEGATIVE_RESULT | 조정 후 수량이 음수가 됩니다 | 수량 부족 |

#### F-M6-015: 재고 변동 이력 조회
- **기능 ID**: F-M6-015
- **기능명**: 재고 변동 이력 조회
- **접근 역할**: store (자기 판매소)
- **입력 데이터**: inventory_id 또는 product_id + spec_id
- **처리 로직**: inventory_log 테이블 시간순 조회
- **출력 데이터**: InventoryLog[]

#### F-M6-016: 판매소 재고 기반 품목 조회
- **기능 ID**: F-M6-016
- **기능명**: 특정 판매소의 재고 있는 품목 조회
- **접근 역할**: user
- **입력 데이터**: store_id, product_id (선택)
- **처리 로직**: inventory 테이블에서 quantity > 0인 품목+규격 조회
- **출력 데이터**: { products: Product[], specs: ProductSpec[] (재고 수량 포함) }
- **관련 규칙**: BR-015

#### F-M6-017: 일별 판매현황
- **기능 ID**: F-M6-017
- **기능명**: 일별 판매 통계
- **접근 역할**: store
- **입력 데이터**: start_date, end_date
- **처리 로직**: orders 테이블에서 자기 판매소 기간별 집계 (판매건수, 포인트)
- **출력 데이터**: { stats: [{date, count, total_amount}], summary: {total_count, total_amount} }

#### F-M6-018: 품목별 판매현황
- **기능 ID**: F-M6-018
- **기능명**: 품목별 판매 통계
- **접근 역할**: store
- **입력 데이터**: start_date, end_date, category_id (선택)
- **처리 로직**: order_items + products 조인 집계
- **출력 데이터**: { stats: [{product_name, spec_name, quantity, total_amount}] }

#### F-M6-019: 사용자별 판매현황
- **기능 ID**: F-M6-019
- **기능명**: 사용자별 판매 통계
- **접근 역할**: store
- **입력 데이터**: start_date, end_date, search (선택)
- **처리 로직**: orders + users 조인 사용자별 집계
- **출력 데이터**: { stats: [{user_name, rank, order_count, total_amount}] }

---

### 3.7 M7: 체척권/정산 관리 모듈

#### F-M7-001: 체척권 현황 조회
- **기능 ID**: F-M7-001
- **기능명**: 체척권 현황 조회
- **접근 역할**: admin (전체), store (관련 주문), tailor (자사 등록분), user (본인)
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| status | string | N |
| start_date | date | N |
| end_date | date | N |
| search | string | N |

- **처리 로직**: tailoring_tickets 테이블 조회 (users, products, tailors 조인, 역할별 필터)
- **출력 데이터**: TailoringTicket[]

#### F-M7-002: 체척권 등록
- **기능 ID**: F-M7-002
- **기능명**: 체척업체 체척권 등록
- **접근 역할**: tailor
- **입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검사 |
|--------|------|------|------------|
| ticket_number | string | Y | TKT-XXXXXXXX-XXXXX 형식 |

- **처리 로직**:
  1. 체척권번호로 조회
  2. 상태 'issued'인 경우만 등록 가능
  3. tailoring_tickets UPDATE:
     - status -> 'registered'
     - tailor_id -> 로그인 사용자의 tailor_id
     - registered_at -> 현재 시간
- **출력 데이터**: { success: true }
- **예외 처리**:

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| NOT_FOUND | 체척권을 찾을 수 없습니다 | 번호 미존재 |
| INVALID_STATUS | 이미 등록된 체척권입니다 | issued가 아닌 상태 |

- **관련 규칙**: BR-031

#### F-M7-003: 체척권 취소 요청
- **기능 ID**: F-M7-003
- **기능명**: 체척권 취소 요청
- **접근 역할**: user, store
- **입력 데이터**: ticket_id (uuid)
- **처리 로직**:
  1. 체척권 상태 'issued'인 경우만 취소 요청 가능
  2. tailoring_tickets.status -> 'cancel_requested'
- **예외 처리**: INVALID_STATUS (issued 아닌 경우)

#### F-M7-004: 체척권 취소 승인
- **기능 ID**: F-M7-004
- **기능명**: 체척권 취소 승인
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| ticket_id | uuid | Y |
| approve | boolean | Y |

- **처리 로직**:
  1. 체척권 상태 'cancel_requested' 확인
  2. 승인(approve=true) 시:
     a. tailoring_tickets.status -> 'cancelled'
     b. point_ledger INSERT (type='add') - 포인트 반환
     c. point_summary.used_points 감소 (오프라인) 또는 reserved_points 감소 (온라인)
  3. 거부(approve=false) 시:
     a. tailoring_tickets.status -> 'issued' (원상복구)
- **출력 데이터**: { success: true }
- **관련 규칙**: BR-032

#### F-M7-005: 체척권 번호 조회
- **기능 ID**: F-M7-005
- **기능명**: 체척권 번호로 상세 조회
- **접근 역할**: tailor
- **입력 데이터**: ticket_number (string)
- **처리 로직**: tailoring_tickets 테이블에서 번호로 조회 (사용자, 품목 정보 포함)
- **출력 데이터**: TailoringTicket

#### F-M7-006: 정산 목록 조회
- **기능 ID**: F-M7-006
- **기능명**: 체척업체 정산 목록 조회
- **접근 역할**: admin (전체), tailor (자사)
- **입력 데이터**: tailor_id (선택), status (선택), 기간
- **처리 로직**: tailor_settlements 테이블 조회 (tailors 조인)
- **출력 데이터**: TailorSettlement[]

#### F-M7-007: 정산 산정
- **기능 ID**: F-M7-007
- **기능명**: 체척업체별 정산 금액 산정
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| tailor_id | uuid | Y |
| start_date | date | Y |
| end_date | date | Y |

- **처리 로직**:
  1. 해당 업체의 등록된(registered) 체척권 조회
  2. 기간 내 체척권 금액 집계
- **출력 데이터**: { total_amount: number, ticket_count: number, tickets: Ticket[] }

#### F-M7-008: 정산 생성
- **기능 ID**: F-M7-008
- **기능명**: 정산 레코드 생성
- **접근 역할**: admin
- **입력 데이터**:

| 필드명 | 타입 | 필수 |
|--------|------|------|
| tailor_id | uuid | Y |
| start_date | date | Y |
| end_date | date | Y |
| total_amount | number | Y |

- **처리 로직**: tailor_settlements INSERT (status='pending')
- **출력 데이터**: { success: true, settlement_id: uuid }

#### F-M7-009: 정산 확정
- **기능 ID**: F-M7-009
- **기능명**: 정산 확정 처리
- **접근 역할**: admin
- **입력 데이터**: settlement_id (uuid)
- **처리 로직**: tailor_settlements.status -> 'confirmed', confirmed_at 기록
- **출력 데이터**: { success: true }

---

## 4. Server Action 함수 명세

### 4.1 actions/auth.ts (5개)

| # | 함수명 | 파라미터 | 반환값 | 에러 코드 |
|---|--------|---------|--------|----------|
| 1 | `login` | { email: string, password: string } | { success, redirect_url } | AUTH_INVALID, VALIDATION |
| 2 | `logout` | - | { success } | - |
| 3 | `resetPassword` | { email: string } | { success } | VALIDATION |
| 4 | `updatePassword` | { password: string, confirmPassword: string } | { success } | VALIDATION |
| 5 | `getCurrentUser` | - | User \| null | AUTH_INVALID, NOT_FOUND |

### 4.2 actions/users.ts (6개)

| # | 함수명 | 파라미터 | 반환값 | 에러 코드 |
|---|--------|---------|--------|----------|
| 1 | `getUsers` | { search?, role?, rank?, page?, pageSize? } | { users, totalCount } | AUTH_INVALID |
| 2 | `getUserById` | { id: uuid } | User | AUTH_INVALID, NOT_FOUND |
| 3 | `createUser` | { name, email, role, rank?, ... } | { success, user_id } | AUTH_INVALID, DUPLICATE_EMAIL, VALIDATION |
| 4 | `bulkCreateUsers` | { file: File } | { success, total, succeeded, failed, errors } | AUTH_INVALID, VALIDATION |
| 5 | `updateUser` | { id, name, rank?, ... } | { success } | AUTH_INVALID, NOT_FOUND, VALIDATION |
| 6 | `getCurrentUser` | - | User | AUTH_INVALID |

### 4.3 actions/products.ts (11개)

| # | 함수명 | 파라미터 | 반환값 | 에러 코드 |
|---|--------|---------|--------|----------|
| 1 | `getCategories` | { parent_id? } | Category[] | - |
| 2 | `createCategory` | { name, parent_id?, level, sort_order? } | { success } | AUTH_INVALID, VALIDATION |
| 3 | `updateCategory` | { id, name, sort_order?, is_active? } | { success } | AUTH_INVALID, NOT_FOUND |
| 4 | `deleteCategory` | { id } | { success } | AUTH_INVALID, HAS_CHILDREN |
| 5 | `getProducts` | { category_id?, product_type?, search? } | Product[] | - |
| 6 | `getProductById` | { id } | Product | NOT_FOUND |
| 7 | `createProduct` | { name, category_l1_id, ..., product_type, price } | { success } | AUTH_INVALID, VALIDATION |
| 8 | `updateProduct` | { id, name?, price?, ... } | { success } | AUTH_INVALID, NOT_FOUND |
| 9 | `deleteProduct` | { id } | { success } | AUTH_INVALID, HAS_CHILDREN |
| 10 | `getProductSpecs` | { product_id } | ProductSpec[] | - |
| 11 | `createProductSpec` | { product_id, name, sort_order? } | { success } | AUTH_INVALID, INVALID_PRODUCT_TYPE |
| - | `updateProductSpec` | { id, name?, sort_order?, is_active? } | { success } | AUTH_INVALID, NOT_FOUND |
| - | `deleteProductSpec` | { id } | { success } | AUTH_INVALID, HAS_INVENTORY |

> 참고: 규격 수정/삭제 포함 시 총 13개이나, 요구사항정의서 기준 products.ts 11개로 산정. 규격 CRUD 3개(조회/등록/수정+삭제)로 집계.

### 4.4 actions/points.ts (6개)

| # | 함수명 | 파라미터 | 반환값 | 에러 코드 |
|---|--------|---------|--------|----------|
| 1 | `calculateAnnualPoints` | { fiscal_year } | { users: CalculationResult[] } | AUTH_INVALID |
| 2 | `grantAnnualPoints` | { fiscal_year } | { success, count, total_amount } | AUTH_INVALID, ALREADY_GRANTED |
| 3 | `triggerPromotionPoints` | { user_id, old_rank, new_rank, promotion_date } | { success, added_amount } | AUTH_INVALID |
| 4 | `getPointSummary` | { search?, rank?, page? } | { summaries, totalCount } | AUTH_INVALID |
| 5 | `getPointLedger` | { user_id, point_type?, start_date?, end_date? } | PointLedger[] | AUTH_INVALID |
| 6 | `getAvailablePoints` | { user_id } | { available_points, total, used, reserved } | AUTH_INVALID |

### 4.5 actions/orders.ts (11개)

| # | 함수명 | 파라미터 | 반환값 | 에러 코드 |
|---|--------|---------|--------|----------|
| 1 | `createOfflineSale` | { user_id, product_type, items } | { success, order_id } | AUTH_INVALID, INSUFFICIENT_POINTS, INSUFFICIENT_STOCK |
| 2 | `createOnlineOrder` | { product_type, store_id?, items, delivery_method?, ... } | { success, order_id, order_number } | AUTH_INVALID, INSUFFICIENT_POINTS, INSUFFICIENT_STOCK |
| 3 | `cancelOrder` | { order_id } | { success } | AUTH_INVALID, INVALID_STATUS |
| 4 | `forceCancelOrder` | { order_id, cancel_reason } | { success } | AUTH_INVALID, INVALID_STATUS |
| 5 | `processReturn` | { order_id, items } | { success } | AUTH_INVALID, INVALID_STATUS, TICKET_REGISTERED |
| 6 | `updateOrderStatus` | { order_id, new_status } | { success } | AUTH_INVALID, INVALID_STATUS_TRANSITION |
| 7 | `getOrders` | { status?, start_date?, end_date?, page? } | { orders, totalCount } | AUTH_INVALID |
| 8 | `getOrderById` | { order_id } | Order | AUTH_INVALID, NOT_FOUND |
| 9 | `getDailySalesStats` | { start_date, end_date } | DailyStat[] | AUTH_INVALID |
| 10 | `getProductSalesStats` | { start_date, end_date, category_id? } | ProductStat[] | AUTH_INVALID |
| 11 | `getUserSalesStats` | { start_date, end_date, search? } | UserStat[] | AUTH_INVALID |

### 4.6 actions/inventory.ts (5개)

| # | 함수명 | 파라미터 | 반환값 | 에러 코드 |
|---|--------|---------|--------|----------|
| 1 | `getInventory` | { store_id?, category_id?, search? } | Inventory[] | AUTH_INVALID |
| 2 | `processIncoming` | { product_id, spec_id, quantity } | { success } | AUTH_INVALID, VALIDATION |
| 3 | `adjustInventory` | { product_id, spec_id, adjustment, reason } | { success } | AUTH_INVALID, NEGATIVE_RESULT |
| 4 | `getInventoryLog` | { inventory_id? } | InventoryLog[] | AUTH_INVALID |
| 5 | `getStoreInventoryForProduct` | { store_id, product_id } | { specs: SpecWithStock[] } | - |

### 4.7 actions/tickets.ts (5개)

| # | 함수명 | 파라미터 | 반환값 | 에러 코드 |
|---|--------|---------|--------|----------|
| 1 | `getTickets` | { status?, start_date?, end_date?, search? } | TailoringTicket[] | AUTH_INVALID |
| 2 | `registerTicket` | { ticket_number } | { success } | AUTH_INVALID, NOT_FOUND, INVALID_STATUS |
| 3 | `requestCancelTicket` | { ticket_id } | { success } | AUTH_INVALID, INVALID_STATUS |
| 4 | `approveCancelTicket` | { ticket_id, approve } | { success } | AUTH_INVALID, INVALID_STATUS |
| 5 | `getTicketByNumber` | { ticket_number } | TailoringTicket | NOT_FOUND |

### 4.8 actions/settlements.ts (4개)

| # | 함수명 | 파라미터 | 반환값 | 에러 코드 |
|---|--------|---------|--------|----------|
| 1 | `getSettlements` | { tailor_id?, status?, start_date?, end_date? } | TailorSettlement[] | AUTH_INVALID |
| 2 | `calculateSettlement` | { tailor_id, start_date, end_date } | { total_amount, ticket_count } | AUTH_INVALID |
| 3 | `createSettlement` | { tailor_id, start_date, end_date, total_amount } | { success, settlement_id } | AUTH_INVALID |
| 4 | `confirmSettlement` | { settlement_id } | { success } | AUTH_INVALID |

### 4.9 기초 데이터 관련 (12개)

| # | 파일 | 함수명 | 파라미터 | 에러 코드 |
|---|------|--------|---------|----------|
| 1 | actions/stores.ts | `getStores` | { search?, is_active? } | - |
| 2 | actions/stores.ts | `createStore` | { name, address?, phone?, manager? } | AUTH_INVALID, VALIDATION |
| 3 | actions/stores.ts | `updateStore` | { id, name?, ... } | AUTH_INVALID, NOT_FOUND |
| 4 | actions/stores.ts | `deleteStore` | { id } | AUTH_INVALID, HAS_CHILDREN, HAS_INVENTORY |
| 5 | actions/tailors.ts | `getTailors` | { search?, is_active? } | - |
| 6 | actions/tailors.ts | `createTailor` | { name, business_number?, ... } | AUTH_INVALID, VALIDATION |
| 7 | actions/tailors.ts | `updateTailor` | { id, name?, ... } | AUTH_INVALID, NOT_FOUND |
| 8 | actions/tailors.ts | `deleteTailor` | { id } | AUTH_INVALID, HAS_CHILDREN |
| 9 | actions/delivery-zones.ts | `getDeliveryZones` | { store_id } | AUTH_INVALID |
| 10 | actions/delivery-zones.ts | `createDeliveryZone` | { name, address, note? } | AUTH_INVALID, VALIDATION |
| 11 | actions/delivery-zones.ts | `updateDeliveryZone` | { id, name?, address? } | AUTH_INVALID, NOT_FOUND |
| 12 | actions/delivery-zones.ts | `deleteDeliveryZone` | { id } | AUTH_INVALID |
| 13 | actions/menus.ts | `getMenus` | { role? } | - |
| 14 | actions/menus.ts | `createMenu` | { name, url?, parent_id?, roles } | AUTH_INVALID, VALIDATION |
| 15 | actions/menus.ts | `updateMenu` | { id, name?, url?, ... } | AUTH_INVALID, NOT_FOUND |
| 16 | actions/menus.ts | `deleteMenu` | { id } | AUTH_INVALID, HAS_CHILDREN |

> 총 API 수: 5 + 6 + 11 + 6 + 11 + 5 + 5 + 4 + 16 = **69개** (요구사항정의서 61개 기준에서 기초 데이터 4파일 16개로 상세화)

---

## 5. 비즈니스 규칙 상세

### 5.1 포인트 관리 규칙

#### BR-001: 가용포인트 산출
- **산출식**: `가용포인트 = total_points - used_points - reserved_points`
- **적용 시점**: 온/오프라인 구매 전 검증, 포인트 현황 표시
- **테이블**: point_summary

#### BR-002: 포인트 범위 내 거래
- **규칙**: 거래 금액 <= 가용포인트
- **적용 시점**: 오프라인 판매 확정, 온라인 주문 확정
- **에러**: INSUFFICIENT_POINTS

#### BR-003: 연간 1회 일괄 지급
- **규칙**: 매년 1월 1일 기준 전체 사용자에게 일괄 지급. 동일 연도 중복 지급 불가.
- **검증**: point_ledger에서 fiscal_year + type='grant' 존재 여부 확인
- **에러**: ALREADY_GRANTED

#### BR-004: 계급별 차등 지급

| 계급 | 연간 포인트 |
|------|------------|
| 장성급 (general) | 1,000,000원 |
| 대령 (colonel) | 800,000원 |
| 중령 (lt_colonel) | 800,000원 |
| 소령 (major) | 800,000원 |
| 대위 (captain) | 600,000원 |
| 중위 (first_lt) | 600,000원 |
| 소위 (second_lt) | 600,000원 |
| 준위 (warrant) | 500,000원 |
| 상사 (sgt_major) | 400,000원 |
| 중사 (master_sgt) | 400,000원 |
| 하사 (sgt) | 400,000원 |
| 군무원 (civil_servant) | 400,000원 |

#### BR-005: 호봉 추가
- **산출식**: `호봉수 = 현재연도 - 입대연도` (enlist_date 기준)
- **추가 금액**: `호봉수 x 5,000원`
- **적용**: 연간 포인트 산정 시 기본금액에 합산

#### BR-006: 진급 시 일할계산
- **산출식**:
  ```
  잔여일수 = 진급일 ~ 12월 31일
  일일 차액 = (신계급 연간 포인트 / 365) - (구계급 연간 포인트 / 365)
  추가 지급 = 일일 차액 x 잔여일수
  ```
- **적용**: 사용자 계급 변경(진급) 시 자동 트리거
- **기록**: point_ledger (type='add', reference_type='annual')

#### BR-007: 퇴직예정자 일할계산
- **산출식**:
  ```
  잔여기간 = 1월 1일 ~ 퇴직예정일 일수
  일할금액 = 연간 포인트 x (잔여기간 / 365)
  ```
- **적용**: 포인트 산정 시 자동 반영, 퇴직예정일 변경 시 차감 트리거

### 5.2 품목/재고 규칙

#### BR-010: 완제품/맞춤피복 분리
- **규칙**: 완제품과 맞춤피복은 별도 구매/판매 (장바구니 섹션 분리, 독립 구매)
- **적용**: 장바구니, 구매 확인, 오프라인 판매

#### BR-011: 맞춤피복 수량 1 고정
- **규칙**: 맞춤피복 주문 수량은 항상 1
- **적용**: 온라인 장바구니 (수량 변경 불가), 오프라인 판매

#### BR-012: 맞춤피복 재고 없음
- **규칙**: 맞춤피복은 재고관리 대상 아님 (체척업체에서 제작)
- **적용**: 재고 조회/입고/조정에서 맞춤피복 제외

#### BR-013: 재고 판매소별 관리
- **규칙**: inventory 테이블은 store_id + spec_id 단위로 관리
- **적용**: 모든 재고 조회/변경

#### BR-014: 완제품 재고 부족 판매 불가
- **규칙**: 오프라인 판매 시 재고 >= 주문수량 필수
- **에러**: INSUFFICIENT_STOCK

#### BR-015: 온라인 판매소 선택 필수
- **규칙**: 온라인 완제품 구매 시 판매소 먼저 선택, 해당 판매소 재고 있는 품목만 표시
- **적용**: 쇼핑 메인 (U-01)

#### BR-016: 온라인 맞춤피복 판매소 불필요
- **규칙**: 맞춤피복 구매 시 판매소 선택 불필요
- **적용**: 쇼핑 메인 (U-01), 구매 확인 (U-05)

#### BR-017: 품목 분류 계층
- **규칙**: 대분류(level1) > 중분류(level2) > 소분류(level3) 계층 유지
- **적용**: 분류 등록/수정, 품목 등록/수정

### 5.3 주문/배송 규칙

#### BR-020: 배송 확정 전 취소 가능
- **규칙**: 온라인 주문은 status가 'delivered'가 되기 전까지만 취소 가능
- **허용 상태**: pending, confirmed, shipping
- **에러**: INVALID_STATUS

#### BR-021: 반품은 판매소에서만
- **규칙**: 반품 처리는 피복판매소 담당자(store)만 수행 가능
- **적용**: 오프라인 판매 건에 대해서만

#### BR-022: 배송 방법 2종
- **규칙**: 택배(parcel) - 주소 직접 입력, 직접배송(direct) - 판매소 배송지 목록 선택
- **적용**: 온라인 완제품 구매 확인 (U-04)

#### BR-023: 맞춤피복 배송 없음
- **규칙**: 맞춤피복은 배송 정보 불필요 (체척권 발행으로 처리)
- **적용**: 온라인 맞춤피복 구매 확인 (U-05)

### 5.4 체척권 규칙

#### BR-030: 체척권 자동 발행
- **규칙**: 맞춤피복 판매/구매 시 체척권 자동 발행 (status='issued')
- **번호 형식**: TKT-YYYYMMDD-NNNNN (시퀀스 기반)
- **적용**: 오프라인 판매 (F-M6-001), 온라인 주문 (F-M6-002)

#### BR-031: 등록 후 취소 불가
- **규칙**: 체척업체에서 체척권을 등록(registered)하면 이후 취소 불가
- **적용**: 체척권 취소 요청, 반품 처리

#### BR-032: 취소 승인권
- **규칙**: 체척권 취소 승인/거부는 군수담당자(admin)만 가능
- **적용**: F-M7-004

#### BR-033: 등록된 체척권 반품 불가
- **규칙**: 체척권이 registered 상태인 맞춤피복은 반품 불가
- **에러**: TICKET_REGISTERED
- **적용**: F-M6-009

---

## 6. 역할별 기능 접근 권한 매트릭스

### 6.1 모듈별 접근 권한

| 기능 | admin | store | tailor | user |
|------|:-----:|:-----:|:------:|:----:|
| **M1: 인증/권한** | | | | |
| 로그인/로그아웃 | O | O | O | O |
| 비밀번호 찾기/변경 | O | O | O | O |
| **M2: 사용자 관리** | | | | |
| 사용자 목록/상세 조회 | O | - | - | - |
| 사용자 등록/수정 | O | - | - | - |
| 사용자 일괄 등록 | O | - | - | - |
| **M3: 기초 데이터** | | | | |
| 판매소 CRUD | O | R | R | R |
| 체척업체 CRUD | O | R | R | R |
| 메뉴 CRUD | O | R | R | R |
| 배송지 CRUD | - | O(자기) | - | R |
| **M4: 품목 관리** | | | | |
| 분류 CRUD | O | R | R | R |
| 품목 CRUD | O | R | R | R |
| 규격 CRUD | O | R | R | R |
| **M5: 포인트 관리** | | | | |
| 포인트 산정/지급 | O | - | - | - |
| 포인트 현황(전체) | O | - | - | - |
| 포인트 현황(본인) | - | - | - | O |
| 포인트 임의 변경 | O | - | - | - |
| **M6: 주문/판매** | | | | |
| 오프라인 판매/반품 | - | O | - | - |
| 온라인 주문 관리 | - | O(자기) | - | - |
| 온라인 구매/취소 | - | - | - | O |
| 구매 내역(본인) | - | - | - | O |
| 재고 관리 | R | O(자기) | - | - |
| 판매 통계 | - | O | - | - |
| **M7: 체척권/정산** | | | | |
| 체척권 현황(전체) | O | R | - | - |
| 체척권 등록 | - | - | O | - |
| 체척권 취소 요청 | - | O | - | O |
| 체척권 취소 승인 | O | - | - | - |
| 체척권 현황(본인) | - | - | O(자사) | O |
| 정산 관리 | O | - | R(자사) | - |

> O = 전체 접근, R = 읽기만, O(자기) = 자기 소속만, - = 접근 불가

---

## 7. 상태 전이 다이어그램

### 7.1 주문 상태 전이

```
[온라인 주문 생성]
     |
     v
  +--------+     판매소 확인     +-----------+     배송 시작     +----------+     배송 완료     +-----------+
  | pending | ----------------> | confirmed | ----------------> | shipping | ----------------> | delivered |
  +--------+                    +-----------+                    +----------+                    +-----------+
     |                               |
     | 사용자 취소                    | 직권 취소
     v                               v
  +-----------+                 +-----------+
  | cancelled |                 | cancelled |
  +-----------+                 +-----------+


[오프라인 판매]
     |
     v
  +-----------+     판매소 반품     +----------+
  | delivered | ----------------> | returned |
  +-----------+                    +----------+
```

### 7.2 체척권 상태 전이

```
[체척권 발행]
     |
     v
  +--------+     체척업체 등록     +------------+
  | issued | ------------------- | registered |  (이후 취소 불가)
  +--------+                     +------------+
     |
     | 사용자/판매소 취소 요청
     v
  +------------------+     admin 승인     +-----------+
  | cancel_requested | -----------------> | cancelled |
  +------------------+                    +-----------+
     |
     | admin 거부
     v
  +--------+
  | issued |  (원상복구)
  +--------+
```

### 7.3 정산 상태 전이

```
  +---------+     admin 생성     +---------+     admin 확정     +-----------+
  | (없음)  | ----------------> | pending | ----------------> | confirmed |
  +---------+                    +---------+                    +-----------+
```

---

## 8. 부록: 에러 코드 전체 목록

| 에러 코드 | 설명 | HTTP 상태 |
|----------|------|----------|
| AUTH_INVALID | 인증 실패 또는 권한 없음 | 401/403 |
| NOT_FOUND | 요청한 리소스 없음 | 404 |
| VALIDATION | 입력 데이터 유효성 검사 실패 | 400 |
| DUPLICATE_EMAIL | 이메일 중복 | 409 |
| INSUFFICIENT_POINTS | 가용포인트 부족 | 400 |
| INSUFFICIENT_STOCK | 재고 부족 | 400 |
| INVALID_STATUS | 현재 상태에서 허용되지 않는 작업 | 400 |
| INVALID_STATUS_TRANSITION | 허용되지 않는 상태 전이 | 400 |
| ALREADY_GRANTED | 해당 연도 포인트 이미 지급됨 | 409 |
| TICKET_REGISTERED | 이미 등록된 체척권 (취소/반품 불가) | 400 |
| HAS_CHILDREN | 하위 데이터 존재하여 삭제 불가 | 400 |
| HAS_INVENTORY | 관련 재고 존재하여 삭제 불가 | 400 |
| NEGATIVE_RESULT | 조정 후 음수 발생 | 400 |
| INVALID_PRODUCT_TYPE | 잘못된 품목 유형 (맞춤피복에 규격 등록 등) | 400 |

---

> **문서 끝** | 기능 ID: 55개 (M1~M7) | Server Action: 69개 | 비즈니스 규칙: 33개 (BR-001~BR-033)
