-- ============================================================
-- 피복 구매관리 시스템 - 초기 스키마 마이그레이션
-- 문서번호: DB-UNIFORM-2026-001
-- 작성일: 2026-03-04
-- ============================================================

-- ============================================================
-- 1. 확장 설치
-- ============================================================

-- UUID 생성을 위한 확장 (Supabase는 기본 활성화되어 있으나 명시)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. 헬퍼 함수
-- ============================================================

-- 현재 사용자의 역할을 반환하는 헬퍼 함수
-- RLS 정책에서 반복 호출되므로 STABLE 캐싱 적용
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 현재 사용자의 소속 판매소 ID를 반환하는 헬퍼 함수
CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT store_id FROM public.users WHERE id = auth.uid();
$$;

-- 현재 사용자의 소속 체척업체 ID를 반환하는 헬퍼 함수
CREATE OR REPLACE FUNCTION get_user_tailor_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT tailor_id FROM public.users WHERE id = auth.uid();
$$;

-- updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. 시퀀스 (번호 자동생성용)
-- ============================================================

-- 주문번호 시퀀스
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1 INCREMENT BY 1;

-- 체척권번호 시퀀스
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1 INCREMENT BY 1;

-- 주문번호 생성 함수 (ORD-YYYYMMDD-NNNNN)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  seq_val := nextval('order_number_seq');
  RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$;

-- 체척권번호 생성 함수 (TKT-YYYYMMDD-NNNNN)
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  seq_val := nextval('ticket_number_seq');
  RETURN 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$;

-- ============================================================
-- 4. 테이블 생성 (참조 순서 준수)
-- ============================================================

-- -----------------------------------------------------------
-- 4.1 stores (피복판매소)
-- 판매소의 기본 정보를 관리한다.
-- -----------------------------------------------------------
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 판매소 고유 ID
  name VARCHAR(100) NOT NULL,                            -- 판매소명
  address TEXT,                                          -- 주소
  phone VARCHAR(20),                                     -- 연락처
  manager_name VARCHAR(50),                              -- 담당자명
  is_active BOOLEAN NOT NULL DEFAULT true,               -- 사용 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),         -- 생성일시
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 수정일시
);

COMMENT ON TABLE stores IS '피복판매소 - 판매소 기본정보 관리';

-- -----------------------------------------------------------
-- 4.2 tailors (체척업체)
-- 맞춤피복 제작 업체의 기본 정보와 정산 계좌 정보를 관리한다.
-- -----------------------------------------------------------
CREATE TABLE tailors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 업체 고유 ID
  name VARCHAR(100) NOT NULL,                            -- 업체명
  business_number VARCHAR(20),                           -- 사업자번호
  representative VARCHAR(50),                            -- 대표자명
  address TEXT,                                          -- 주소
  phone VARCHAR(20),                                     -- 연락처
  bank_name VARCHAR(50),                                 -- 은행명
  account_number VARCHAR(30),                            -- 계좌번호
  account_holder VARCHAR(50),                            -- 예금주
  is_active BOOLEAN NOT NULL DEFAULT true,               -- 사용 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),         -- 생성일시
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 수정일시
);

COMMENT ON TABLE tailors IS '체척업체 - 맞춤피복 제작업체 정보 관리';

-- -----------------------------------------------------------
-- 4.3 users (사용자)
-- 4개 역할(admin, store, tailor, user) 통합 사용자 정보.
-- auth.users와 1:1 연동.
-- -----------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,  -- Supabase Auth 사용자 ID
  email VARCHAR(255) NOT NULL UNIQUE,                    -- 이메일 (로그인 ID)
  name VARCHAR(50) NOT NULL,                             -- 이름
  role VARCHAR(20) NOT NULL                              -- 역할
    CHECK (role IN ('admin', 'store', 'tailor', 'user')),
  rank VARCHAR(20)                                       -- 계급 (user 역할만)
    CHECK (rank IN (
      'general', 'colonel', 'lt_colonel', 'major',
      'captain', 'first_lt', 'second_lt', 'warrant',
      'sgt_major', 'master_sgt', 'sgt', 'civil_servant'
    )),
  military_number VARCHAR(30),                           -- 군번/사번
  unit VARCHAR(100),                                     -- 소속
  enlist_date DATE,                                      -- 입대일/근무시작일
  promotion_date DATE,                                   -- 최근 진급일
  retirement_date DATE,                                  -- 퇴직예정일
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL, -- 소속 판매소 (store 역할)
  tailor_id UUID REFERENCES tailors(id) ON DELETE SET NULL, -- 소속 업체 (tailor 역할)
  is_active BOOLEAN NOT NULL DEFAULT true,               -- 활성 상태
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),         -- 생성일시
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 수정일시
);

COMMENT ON TABLE users IS '사용자 - 4개 역할 통합 (admin/store/tailor/user)';

-- -----------------------------------------------------------
-- 4.4 categories (품목분류)
-- 대/중/소 3단계 품목 분류를 자기참조로 관리한다.
-- -----------------------------------------------------------
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 분류 고유 ID
  name VARCHAR(100) NOT NULL,                            -- 분류명
  parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT, -- 상위 분류 ID
  level SMALLINT NOT NULL                                -- 단계 (1:대, 2:중, 3:소)
    CHECK (level IN (1, 2, 3)),
  sort_order INTEGER NOT NULL DEFAULT 0,                 -- 정렬 순서
  is_active BOOLEAN NOT NULL DEFAULT true,               -- 사용 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 생성일시
);

COMMENT ON TABLE categories IS '품목분류 - 대/중/소 3단계 자기참조 구조';

-- -----------------------------------------------------------
-- 4.5 products (품목)
-- 완제품/맞춤피복 품목의 기본 정보를 관리한다.
-- -----------------------------------------------------------
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 품목 고유 ID
  name VARCHAR(100) NOT NULL,                            -- 품목명
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT, -- 소분류 ID
  product_type VARCHAR(20) NOT NULL                      -- 품목유형
    CHECK (product_type IN ('finished', 'custom')),
  price INTEGER NOT NULL CHECK (price >= 0),             -- 단가 (원)
  image_url TEXT,                                        -- 이미지 URL
  description TEXT,                                      -- 설명
  is_active BOOLEAN NOT NULL DEFAULT true,               -- 사용 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),         -- 생성일시
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 수정일시
);

COMMENT ON TABLE products IS '품목 - 완제품(finished)/맞춤피복(custom)';

-- -----------------------------------------------------------
-- 4.6 product_specs (규격)
-- 완제품의 사이즈(규격) 정보를 관리한다.
-- -----------------------------------------------------------
CREATE TABLE product_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 규격 고유 ID
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE, -- 품목 ID
  spec_name VARCHAR(50) NOT NULL,                        -- 규격명 (95, 100, 105 등)
  sort_order INTEGER NOT NULL DEFAULT 0,                 -- 정렬 순서
  is_active BOOLEAN NOT NULL DEFAULT true,               -- 사용 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 생성일시
);

COMMENT ON TABLE product_specs IS '규격 - 완제품 사이즈 관리';

-- -----------------------------------------------------------
-- 4.7 delivery_zones (배송지)
-- 판매소별 직접 배송 가능 지역을 관리한다.
-- -----------------------------------------------------------
CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 배송지 고유 ID
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE, -- 판매소 ID
  name VARCHAR(100) NOT NULL,                            -- 배송지명
  address TEXT,                                          -- 주소
  note TEXT,                                             -- 비고
  is_active BOOLEAN NOT NULL DEFAULT true,               -- 사용 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 생성일시
);

COMMENT ON TABLE delivery_zones IS '배송지 - 판매소별 직접배송 가능 지역';

-- -----------------------------------------------------------
-- 4.8 inventory (재고)
-- 판매소+품목+규격 단위의 현재 재고 수량을 관리한다.
-- -----------------------------------------------------------
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 재고 고유 ID
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE, -- 판매소 ID
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT, -- 품목 ID
  spec_id UUID NOT NULL REFERENCES product_specs(id) ON DELETE RESTRICT, -- 규격 ID
  quantity INTEGER NOT NULL DEFAULT 0                    -- 현재 재고 수량
    CHECK (quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),         -- 생성일시
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),         -- 수정일시

  -- 판매소+품목+규격 조합은 유일해야 한다
  CONSTRAINT uq_inventory_store_product_spec UNIQUE (store_id, product_id, spec_id)
);

COMMENT ON TABLE inventory IS '재고 - 판매소+품목+규격별 현재고 관리';

-- -----------------------------------------------------------
-- 4.9 inventory_log (재고변동이력)
-- 재고의 모든 변동 이력을 기록한다.
-- -----------------------------------------------------------
CREATE TABLE inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 이력 고유 ID
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE, -- 재고 ID
  change_type VARCHAR(20) NOT NULL                       -- 변동유형
    CHECK (change_type IN ('incoming', 'sale', 'return', 'adjust_up', 'adjust_down')),
  quantity INTEGER NOT NULL,                             -- 변동수량 (양수)
  reason TEXT,                                           -- 사유
  reference_id UUID,                                     -- 참조 ID (주문 등)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 생성일시
);

COMMENT ON TABLE inventory_log IS '재고변동이력 - 입고/판매/반품/조정 기록';

-- -----------------------------------------------------------
-- 4.10 point_summary (포인트요약)
-- 사용자별 포인트 잔액 요약. users와 1:1 관계.
-- -----------------------------------------------------------
CREATE TABLE point_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 요약 고유 ID
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, -- 사용자 ID
  total_points INTEGER NOT NULL DEFAULT 0                -- 총 지급 포인트
    CHECK (total_points >= 0),
  used_points INTEGER NOT NULL DEFAULT 0                 -- 사용 포인트
    CHECK (used_points >= 0),
  reserved_points INTEGER NOT NULL DEFAULT 0             -- 예약 포인트
    CHECK (reserved_points >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 생성일시
);

COMMENT ON TABLE point_summary IS '포인트요약 - 사용자별 총지급/사용/예약 잔액';

-- -----------------------------------------------------------
-- 4.11 point_ledger (포인트원장)
-- 모든 포인트 변동 이력을 시간순으로 기록한다.
-- -----------------------------------------------------------
CREATE TABLE point_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 원장 고유 ID
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 사용자 ID
  point_type VARCHAR(20) NOT NULL                        -- 변동유형
    CHECK (point_type IN ('grant', 'deduct', 'add', 'return', 'reserve', 'release')),
  amount INTEGER NOT NULL CHECK (amount > 0),            -- 금액 (양수)
  balance_after INTEGER,                                 -- 변동 후 잔액
  description TEXT,                                      -- 설명
  reference_type VARCHAR(30),                            -- 참조유형 (order/ticket/annual)
  reference_id UUID,                                     -- 참조 ID
  fiscal_year SMALLINT,                                  -- 회계연도
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 생성일시
);

COMMENT ON TABLE point_ledger IS '포인트원장 - 모든 포인트 변동 이력 (원장 패턴)';

-- -----------------------------------------------------------
-- 4.12 orders (주문)
-- 온라인/오프라인 주문을 통합 관리한다.
-- -----------------------------------------------------------
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 주문 고유 ID
  order_number VARCHAR(30) NOT NULL UNIQUE,              -- 주문번호 (ORD-YYYYMMDD-NNNNN)
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- 구매자 ID
  store_id UUID REFERENCES stores(id) ON DELETE RESTRICT, -- 판매소 ID (맞춤피복 온라인 주문 시 NULL)
  order_type VARCHAR(20) NOT NULL                        -- 주문유형
    CHECK (order_type IN ('online', 'offline')),
  product_type VARCHAR(20) NOT NULL                      -- 품목유형
    CHECK (product_type IN ('finished', 'custom')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'          -- 주문상태
    CHECK (status IN ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled', 'returned')),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0), -- 총 금액 (원)
  delivery_method VARCHAR(20)                            -- 배송방법 (온라인만)
    CHECK (delivery_method IN ('parcel', 'direct')),
  delivery_zone_id UUID REFERENCES delivery_zones(id) ON DELETE SET NULL, -- 직접배송지 ID
  delivery_address TEXT,                                 -- 택배 배송주소
  cancel_reason TEXT,                                    -- 취소 사유
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),         -- 생성일시
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 수정일시
);

COMMENT ON TABLE orders IS '주문 - 온라인/오프라인 통합 관리';

-- -----------------------------------------------------------
-- 4.13 order_items (주문상세)
-- 주문별 품목 목록을 관리한다.
-- -----------------------------------------------------------
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 주문상세 고유 ID
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE, -- 주문 ID
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT, -- 품목 ID
  spec_id UUID REFERENCES product_specs(id) ON DELETE RESTRICT, -- 규격 ID (완제품만)
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0), -- 수량
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),   -- 단가
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),       -- 소계 (단가 x 수량)
  item_type VARCHAR(20) NOT NULL                         -- 품목유형
    CHECK (item_type IN ('finished', 'custom')),
  status VARCHAR(20) NOT NULL DEFAULT 'ordered'          -- 항목상태
    CHECK (status IN ('ordered', 'returned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 생성일시
);

COMMENT ON TABLE order_items IS '주문상세 - 주문별 품목 목록';

-- -----------------------------------------------------------
-- 4.14 tailoring_tickets (체척권)
-- 맞춤피복 체척권의 발행/등록/취소 상태를 관리한다.
-- -----------------------------------------------------------
CREATE TABLE tailoring_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 체척권 고유 ID
  ticket_number VARCHAR(30) NOT NULL UNIQUE,             -- 체척권번호 (TKT-YYYYMMDD-NNNNN)
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT, -- 주문상세 ID
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- 사용자 ID
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT, -- 품목 ID
  amount INTEGER NOT NULL CHECK (amount >= 0),           -- 금액
  status VARCHAR(20) NOT NULL DEFAULT 'issued'           -- 상태
    CHECK (status IN ('issued', 'registered', 'cancel_requested', 'cancelled')),
  tailor_id UUID REFERENCES tailors(id) ON DELETE SET NULL, -- 등록 체척업체 ID
  registered_at TIMESTAMPTZ,                             -- 업체 등록 일시
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),         -- 발행일시
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 수정일시
);

COMMENT ON TABLE tailoring_tickets IS '체척권 - 맞춤피복 체척권 발행/등록/취소 관리';

-- -----------------------------------------------------------
-- 4.15 tailor_settlements (체척업체정산)
-- 체척업체별 정산 금액과 확정 상태를 관리한다.
-- -----------------------------------------------------------
CREATE TABLE tailor_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 정산 고유 ID
  tailor_id UUID NOT NULL REFERENCES tailors(id) ON DELETE RESTRICT, -- 업체 ID
  period_start DATE NOT NULL,                            -- 정산 시작일
  period_end DATE NOT NULL,                              -- 정산 종료일
  ticket_count INTEGER NOT NULL DEFAULT 0,               -- 체척권 수
  total_amount INTEGER NOT NULL DEFAULT 0                -- 정산 총액
    CHECK (total_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'          -- 정산상태
    CHECK (status IN ('pending', 'confirmed')),
  confirmed_at TIMESTAMPTZ,                              -- 확정 일시
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),         -- 생성일시
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 수정일시
);

COMMENT ON TABLE tailor_settlements IS '체척업체정산 - 업체별 정산 금액/확정 관리';

-- -----------------------------------------------------------
-- 4.16 menus (메뉴)
-- 역할별 메뉴 항목을 자기참조 구조로 관리한다.
-- -----------------------------------------------------------
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- 메뉴 고유 ID
  name VARCHAR(100) NOT NULL,                            -- 메뉴명
  url VARCHAR(255),                                      -- URL 경로
  parent_id UUID REFERENCES menus(id) ON DELETE CASCADE, -- 상위 메뉴 ID
  sort_order INTEGER NOT NULL DEFAULT 0,                 -- 정렬 순서
  roles TEXT[] NOT NULL,                                 -- 접근 역할 배열 (admin, store 등)
  is_active BOOLEAN NOT NULL DEFAULT true,               -- 사용 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()          -- 생성일시
);

COMMENT ON TABLE menus IS '메뉴 - 역할별 메뉴 관리 (자기참조)';

-- ============================================================
-- 5. updated_at 자동 갱신 트리거 (8개 테이블)
-- ============================================================

-- users
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- stores
CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- tailors
CREATE TRIGGER trg_tailors_updated_at
  BEFORE UPDATE ON tailors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- products
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- orders
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- inventory
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- tailoring_tickets
CREATE TRIGGER trg_tailoring_tickets_updated_at
  BEFORE UPDATE ON tailoring_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- tailor_settlements
CREATE TRIGGER trg_tailor_settlements_updated_at
  BEFORE UPDATE ON tailor_settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. 인덱스 생성
-- ============================================================

-- stores
CREATE INDEX idx_stores_is_active ON stores (is_active);

-- tailors
CREATE INDEX idx_tailors_is_active ON tailors (is_active);

-- users
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_store_id ON users (store_id);
CREATE INDEX idx_users_tailor_id ON users (tailor_id);
CREATE INDEX idx_users_is_active ON users (is_active);

-- categories
CREATE INDEX idx_categories_parent_id ON categories (parent_id);

-- products
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_product_type ON products (product_type);
CREATE INDEX idx_products_is_active ON products (is_active);

-- product_specs
CREATE INDEX idx_product_specs_product_id ON product_specs (product_id);

-- delivery_zones
CREATE INDEX idx_delivery_zones_store_id ON delivery_zones (store_id);

-- inventory
CREATE INDEX idx_inventory_store_id ON inventory (store_id);
CREATE INDEX idx_inventory_product_spec ON inventory (product_id, spec_id);

-- inventory_log
CREATE INDEX idx_inventory_log_inventory_id ON inventory_log (inventory_id);

-- point_ledger
CREATE INDEX idx_point_ledger_user_id ON point_ledger (user_id);
CREATE INDEX idx_point_ledger_fiscal_year ON point_ledger (fiscal_year);
CREATE INDEX idx_point_ledger_created_at ON point_ledger (created_at);

-- orders
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_store_id ON orders (store_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_order_type ON orders (order_type);
CREATE INDEX idx_orders_created_at ON orders (created_at);

-- order_items
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);

-- tailoring_tickets
CREATE INDEX idx_tailoring_tickets_user_id ON tailoring_tickets (user_id);
CREATE INDEX idx_tailoring_tickets_tailor_id ON tailoring_tickets (tailor_id);
CREATE INDEX idx_tailoring_tickets_status ON tailoring_tickets (status);

-- tailor_settlements
CREATE INDEX idx_tailor_settlements_tailor_id ON tailor_settlements (tailor_id);

-- menus
CREATE INDEX idx_menus_parent_id ON menus (parent_id);

-- ============================================================
-- 7. RLS 활성화
-- ============================================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailors ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailoring_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailor_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. RLS 정책 정의
-- ============================================================

-- -----------------------------------------------------------
-- 8.1 stores (피복판매소)
-- -----------------------------------------------------------

-- 군수담당자: 전체 접근
CREATE POLICY "stores_admin_all" ON stores
  FOR ALL USING (get_user_role() = 'admin');

-- 기타 역할: 조회만
CREATE POLICY "stores_public_select" ON stores
  FOR SELECT USING (get_user_role() IN ('store', 'tailor', 'user'));

-- -----------------------------------------------------------
-- 8.2 tailors (체척업체)
-- -----------------------------------------------------------

CREATE POLICY "tailors_admin_all" ON tailors
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "tailors_public_select" ON tailors
  FOR SELECT USING (get_user_role() IN ('store', 'tailor', 'user'));

-- -----------------------------------------------------------
-- 8.3 users (사용자)
-- -----------------------------------------------------------

-- 군수담당자: 전체 접근
CREATE POLICY "users_admin_all" ON users
  FOR ALL USING (get_user_role() = 'admin');

-- 판매소: user 역할만 조회 (구매자 검색용)
CREATE POLICY "users_store_select" ON users
  FOR SELECT USING (
    get_user_role() = 'store' AND role = 'user'
  );

-- 일반사용자: 본인만 조회
CREATE POLICY "users_self_select" ON users
  FOR SELECT USING (
    get_user_role() = 'user' AND id = auth.uid()
  );

-- -----------------------------------------------------------
-- 8.4 categories (품목분류)
-- -----------------------------------------------------------

CREATE POLICY "categories_admin_all" ON categories
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "categories_public_select" ON categories
  FOR SELECT USING (get_user_role() IN ('store', 'tailor', 'user'));

-- -----------------------------------------------------------
-- 8.5 products (품목)
-- -----------------------------------------------------------

CREATE POLICY "products_admin_all" ON products
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "products_public_select" ON products
  FOR SELECT USING (get_user_role() IN ('store', 'tailor', 'user'));

-- -----------------------------------------------------------
-- 8.6 product_specs (규격)
-- -----------------------------------------------------------

CREATE POLICY "product_specs_admin_all" ON product_specs
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "product_specs_public_select" ON product_specs
  FOR SELECT USING (get_user_role() IN ('store', 'tailor', 'user'));

-- -----------------------------------------------------------
-- 8.7 delivery_zones (배송지)
-- -----------------------------------------------------------

-- 군수담당자: 전체 접근
CREATE POLICY "delivery_zones_admin_all" ON delivery_zones
  FOR ALL USING (get_user_role() = 'admin');

-- 판매소: 자기 판매소 배송지만 전체 접근
CREATE POLICY "delivery_zones_store_all" ON delivery_zones
  FOR ALL USING (
    get_user_role() = 'store' AND store_id = get_user_store_id()
  );

-- 일반사용자: 조회만
CREATE POLICY "delivery_zones_user_select" ON delivery_zones
  FOR SELECT USING (get_user_role() = 'user');

-- -----------------------------------------------------------
-- 8.8 inventory (재고)
-- -----------------------------------------------------------

-- 군수담당자: 조회만
CREATE POLICY "inventory_admin_select" ON inventory
  FOR SELECT USING (get_user_role() = 'admin');

-- 판매소: 자기 판매소 재고 전체 접근
CREATE POLICY "inventory_store_all" ON inventory
  FOR ALL USING (
    get_user_role() = 'store' AND store_id = get_user_store_id()
  );

-- 일반사용자: 조회만
CREATE POLICY "inventory_user_select" ON inventory
  FOR SELECT USING (get_user_role() = 'user');

-- -----------------------------------------------------------
-- 8.9 inventory_log (재고변동이력)
-- -----------------------------------------------------------

-- 군수담당자: 조회만
CREATE POLICY "inventory_log_admin_select" ON inventory_log
  FOR SELECT USING (get_user_role() = 'admin');

-- 판매소: 자기 판매소 재고 이력 전체 접근
CREATE POLICY "inventory_log_store_all" ON inventory_log
  FOR ALL USING (
    get_user_role() = 'store'
    AND inventory_id IN (
      SELECT id FROM inventory WHERE store_id = get_user_store_id()
    )
  );

-- -----------------------------------------------------------
-- 8.10 point_summary (포인트요약)
-- -----------------------------------------------------------

-- 군수담당자: 전체 접근
CREATE POLICY "point_summary_admin_all" ON point_summary
  FOR ALL USING (get_user_role() = 'admin');

-- 판매소: 조회만 (가용포인트 확인용)
CREATE POLICY "point_summary_store_select" ON point_summary
  FOR SELECT USING (get_user_role() = 'store');

-- 일반사용자: 본인만 조회
CREATE POLICY "point_summary_user_select" ON point_summary
  FOR SELECT USING (
    get_user_role() = 'user' AND user_id = auth.uid()
  );

-- -----------------------------------------------------------
-- 8.11 point_ledger (포인트원장)
-- -----------------------------------------------------------

-- 군수담당자: 전체 접근
CREATE POLICY "point_ledger_admin_all" ON point_ledger
  FOR ALL USING (get_user_role() = 'admin');

-- 일반사용자: 본인만 조회
CREATE POLICY "point_ledger_user_select" ON point_ledger
  FOR SELECT USING (
    get_user_role() = 'user' AND user_id = auth.uid()
  );

-- -----------------------------------------------------------
-- 8.12 orders (주문)
-- -----------------------------------------------------------

-- 군수담당자: 전체 접근
CREATE POLICY "orders_admin_all" ON orders
  FOR ALL USING (get_user_role() = 'admin');

-- 판매소: 자기 판매소 주문 전체 접근
CREATE POLICY "orders_store_all" ON orders
  FOR ALL USING (
    get_user_role() = 'store' AND store_id = get_user_store_id()
  );

-- 일반사용자: 본인 주문 조회
CREATE POLICY "orders_user_select" ON orders
  FOR SELECT USING (
    get_user_role() = 'user' AND user_id = auth.uid()
  );

-- 일반사용자: 본인 주문 생성
CREATE POLICY "orders_user_insert" ON orders
  FOR INSERT WITH CHECK (
    get_user_role() = 'user' AND user_id = auth.uid()
  );

-- -----------------------------------------------------------
-- 8.13 order_items (주문상세)
-- -----------------------------------------------------------

-- 군수담당자: 전체 접근
CREATE POLICY "order_items_admin_all" ON order_items
  FOR ALL USING (get_user_role() = 'admin');

-- 판매소: 자기 판매소 주문의 상세 전체 접근
CREATE POLICY "order_items_store_all" ON order_items
  FOR ALL USING (
    get_user_role() = 'store'
    AND order_id IN (
      SELECT id FROM orders WHERE store_id = get_user_store_id()
    )
  );

-- 일반사용자: 본인 주문 상세 조회
CREATE POLICY "order_items_user_select" ON order_items
  FOR SELECT USING (
    get_user_role() = 'user'
    AND order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- 8.14 tailoring_tickets (체척권)
-- -----------------------------------------------------------

-- 군수담당자: 전체 접근
CREATE POLICY "tailoring_tickets_admin_all" ON tailoring_tickets
  FOR ALL USING (get_user_role() = 'admin');

-- 판매소: 조회만
CREATE POLICY "tailoring_tickets_store_select" ON tailoring_tickets
  FOR SELECT USING (get_user_role() = 'store');

-- 체척업체: 자사 등록 체척권 + 미등록(issued) 체척권 접근
CREATE POLICY "tailoring_tickets_tailor_all" ON tailoring_tickets
  FOR ALL USING (
    get_user_role() = 'tailor'
    AND (
      tailor_id = get_user_tailor_id()
      OR (tailor_id IS NULL AND status = 'issued')
    )
  );

-- 일반사용자: 본인 체척권 조회
CREATE POLICY "tailoring_tickets_user_select" ON tailoring_tickets
  FOR SELECT USING (
    get_user_role() = 'user' AND user_id = auth.uid()
  );

-- -----------------------------------------------------------
-- 8.15 tailor_settlements (체척업체정산)
-- -----------------------------------------------------------

-- 군수담당자: 전체 접근
CREATE POLICY "tailor_settlements_admin_all" ON tailor_settlements
  FOR ALL USING (get_user_role() = 'admin');

-- 체척업체: 자사 정산 조회만
CREATE POLICY "tailor_settlements_tailor_select" ON tailor_settlements
  FOR SELECT USING (
    get_user_role() = 'tailor' AND tailor_id = get_user_tailor_id()
  );

-- -----------------------------------------------------------
-- 8.16 menus (메뉴)
-- -----------------------------------------------------------

-- 군수담당자: 전체 접근
CREATE POLICY "menus_admin_all" ON menus
  FOR ALL USING (get_user_role() = 'admin');

-- 기타 역할: 조회만
CREATE POLICY "menus_public_select" ON menus
  FOR SELECT USING (get_user_role() IN ('store', 'tailor', 'user'));

-- ============================================================
-- 완료: 16개 테이블, 8개 트리거, 6개 함수, 2개 시퀀스,
--       31개 인덱스, 32개 RLS 정책 생성
-- ============================================================
