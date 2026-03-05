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
import { registerTicketAction, requestCancelTicketAction } from '@/actions/tickets'

const STATUS_LABELS: Record<string, string> = {
  issued: '발행',
  registered: '등록완료',
  cancel_requested: '취소요청',
  cancelled: '취소됨',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  issued: 'default',
  registered: 'secondary',
  cancel_requested: 'destructive',
  cancelled: 'outline',
}

interface TicketRow {
  id: string
  ticketNumber: string
  userName: string
  userRank: string | null
  productName: string
  amount: number
  status: string
  createdAt: number
  registeredAt: number | null
}

interface TicketsClientProps {
  tickets: TicketRow[]
}

function formatPoints(n: number) {
  return n.toLocaleString('ko-KR')
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR')
}

export function TicketsClient({ tickets: initialTickets }: TicketsClientProps) {
  const [tickets, setTickets] = useState(initialTickets)

  async function handleRegister(ticketId: string) {
    const result = await registerTicketAction({ ticketId })
    if (result.success) {
      toast.success('체척권이 등록되었습니다')
      setTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, status: 'registered', registeredAt: Date.now() } : t
      ))
    } else {
      toast.error(result.error ?? '등록에 실패했습니다')
    }
  }

  async function handleCancelRequest(ticketId: string) {
    if (!confirm('취소를 요청하시겠습니까? 군수담당자 승인 후 처리됩니다.')) return
    const result = await requestCancelTicketAction({ ticketId })
    if (result.success) {
      toast.success('취소 요청이 접수되었습니다')
      setTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, status: 'cancel_requested' } : t
      ))
    } else {
      toast.error(result.error ?? '취소 요청에 실패했습니다')
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">체척권 관리</h2>
      <div className="border rounded-[4px] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>체척권번호</TableHead>
              <TableHead className="w-[100px]">고객</TableHead>
              <TableHead>품목</TableHead>
              <TableHead className="w-[100px] text-right">금액</TableHead>
              <TableHead className="w-[80px]">상태</TableHead>
              <TableHead className="w-[100px]">발행일</TableHead>
              <TableHead className="w-[100px]">등록일</TableHead>
              <TableHead className="w-[120px]">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  등록된 체척권이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              tickets.map(ticket => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono text-sm">{ticket.ticketNumber}</TableCell>
                  <TableCell className="text-sm">
                    {ticket.userName}
                    {ticket.userRank && (
                      <span className="ml-1 text-xs text-muted-foreground">({ticket.userRank})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{ticket.productName}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPoints(ticket.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_VARIANT[ticket.status] ?? 'secondary'}
                      className="rounded-[2px]"
                    >
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(ticket.createdAt)}</TableCell>
                  <TableCell className="text-sm">
                    {ticket.registeredAt ? formatDate(ticket.registeredAt) : '-'}
                  </TableCell>
                  <TableCell>
                    {ticket.status === 'issued' && (
                      <Button
                        size="sm"
                        className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white text-xs h-7"
                        onClick={() => handleRegister(ticket.id)}
                      >
                        등록
                      </Button>
                    )}
                    {ticket.status === 'registered' && (
                      <button
                        className="text-sm text-red-500 hover:underline"
                        onClick={() => handleCancelRequest(ticket.id)}
                      >
                        취소 요청
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
