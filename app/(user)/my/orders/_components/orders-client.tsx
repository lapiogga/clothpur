"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cancelOnlineOrderAction } from '@/actions/orders-user'

const STATUS_LABELS: Record<string, string> = {
  pending: '접수',
  confirmed: '확인',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
  returned: '반품',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'default',
  confirmed: 'secondary',
  shipping: 'default',
  delivered: 'secondary',
  cancelled: 'destructive',
  returned: 'outline',
}

interface OrderRow {
  id: string
  orderNumber: string
  orderType: string
  productType: string
  status: string
  totalAmount: number
  createdAt: number
  storeName: string | null
  itemSummary: string
}

interface OrdersClientProps {
  orders: OrderRow[]
}

function formatPoints(n: number) {
  return n.toLocaleString('ko-KR')
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR')
}

export function OrdersClient({ orders: initialOrders }: OrdersClientProps) {
  const [orders, setOrders] = useState(initialOrders)

  async function handleCancel(orderId: string, orderNumber: string) {
    if (!confirm(`주문 ${orderNumber}을 취소하시겠습니까?`)) return
    const result = await cancelOnlineOrderAction(orderId)
    if (result.success) {
      toast.success('주문이 취소되었습니다')
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status: 'cancelled' } : o
      ))
    } else {
      toast.error(result.error ?? '취소에 실패했습니다')
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">주문 내역</h2>
      <div className="border rounded-[4px] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>주문번호</TableHead>
              <TableHead className="w-[80px]">유형</TableHead>
              <TableHead>품목</TableHead>
              <TableHead className="w-[100px]">판매소</TableHead>
              <TableHead className="w-[100px] text-right">금액</TableHead>
              <TableHead className="w-[80px]">상태</TableHead>
              <TableHead className="w-[100px]">주문일</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  주문 내역이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-[2px] text-xs">
                      {order.orderType === 'online' ? '온라인' : '오프라인'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{order.itemSummary}</TableCell>
                  <TableCell className="text-sm">{order.storeName ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPoints(order.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_VARIANT[order.status] ?? 'secondary'}
                      className="rounded-[2px]"
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(order.createdAt)}</TableCell>
                  <TableCell>
                    {order.status === 'pending' && order.orderType === 'online' && (
                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => handleCancel(order.id, order.orderNumber)}
                      >
                        취소
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
