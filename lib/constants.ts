import type { Rank } from '@/types'

// 계급별 연간 피복포인트 (원)
export const ANNUAL_POINTS: Record<Rank, number> = {
  // 병사
  이병: 300000,
  일병: 300000,
  상병: 300000,
  병장: 300000,
  // 부사관
  하사: 600000,
  중사: 650000,
  상사: 700000,
  원사: 750000,
  준위: 750000,
  // 장교
  소위: 800000,
  중위: 850000,
  대위: 900000,
  소령: 950000,
  중령: 1000000,
  대령: 1100000,
  준장: 1200000,
  소장: 1300000,
  중장: 1400000,
  대장: 1500000,
}

// 포인트 유효기간 (연도 단위)
export const POINT_EXPIRY_YEARS = 2

// 주문 상태 표시 라벨
export const ORDER_STATUS_LABELS = {
  pending: '주문대기',
  confirmed: '주문확인',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
  returned: '반품',
} as const

// 체척권 상태 표시 라벨
export const TICKET_STATUS_LABELS = {
  issued: '발행',
  registered: '등록',
  cancel_requested: '취소요청',
  cancelled: '취소',
} as const
