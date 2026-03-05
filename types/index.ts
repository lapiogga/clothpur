// 사용자 역할
export type UserRole = 'admin' | 'store' | 'tailor' | 'user'

// 계급
export type Rank =
  | '이병' | '일병' | '상병' | '병장'
  | '하사' | '중사' | '상사' | '원사' | '준위'
  | '소위' | '중위' | '대위' | '소령' | '중령' | '대령'
  | '준장' | '소장' | '중장' | '대장'

// 주문 타입
export type OrderType = 'online' | 'offline'

// 주문 상태
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'

// 주문 품목 타입
export type OrderItemType = 'finished' | 'custom'

// 포인트 거래 타입
export type PointTransactionType =
  | 'grant'       // 포인트 지급
  | 'deduct'      // 차감 (구매 확정)
  | 'reserve'     // 예약 (온라인 주문)
  | 'release'     // 예약 해제 (취소)
  | 'expire'      // 만료

// 재고 변동 타입
export type InventoryLogType = 'sale' | 'incoming' | 'return' | 'adjust'

// 체척권 상태
export type TicketStatus =
  | 'issued'
  | 'registered'
  | 'cancel_requested'
  | 'cancelled'
