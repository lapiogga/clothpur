"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { UserRole, Rank } from '@/types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '군수담당자',
  store: '판매소',
  tailor: '체척업체',
  user: '일반사용자',
}

const RANKS: Rank[] = [
  '이병', '일병', '상병', '병장',
  '하사', '중사', '상사', '원사', '준위',
  '소위', '중위', '대위', '소령', '중령', '대령',
  '준장', '소장', '중장', '대장',
]

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  rank: string | null
  militaryNumber: string | null
  unit: string | null
  isActive: boolean
  createdAt: number
  storeName?: string | null
  tailorName?: string | null
}

interface UsersTableProps {
  users: UserRow[]
  totalCount: number
  currentPage: number
  currentRole?: string
  currentRank?: string
  currentSearch?: string
}

export function UsersTable({
  users,
  totalCount,
  currentPage,
  currentRole,
  currentRank,
  currentSearch,
}: UsersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentSearch ?? '')
  const totalPages = Math.max(1, Math.ceil(totalCount / 20))

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/admin/users?${params.toString()}`)
  }

  function handleSearch() {
    const params = new URLSearchParams(searchParams.toString())
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    params.delete('page')
    router.push(`/admin/users?${params.toString()}`)
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`/admin/users?${params.toString()}`)
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toISOString().slice(0, 10)
  }

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex items-center gap-3">
        <Select
          value={currentRole ?? 'all'}
          onValueChange={(v) => updateFilter('role', v)}
        >
          <SelectTrigger className="w-[140px] rounded-[4px]">
            <SelectValue placeholder="역할" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 역할</SelectItem>
            <SelectItem value="admin">군수담당자</SelectItem>
            <SelectItem value="store">판매소</SelectItem>
            <SelectItem value="tailor">체척업체</SelectItem>
            <SelectItem value="user">일반사용자</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={currentRank ?? 'all'}
          onValueChange={(v) => updateFilter('rank', v)}
        >
          <SelectTrigger className="w-[120px] rounded-[4px]">
            <SelectValue placeholder="계급" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 계급</SelectItem>
            {RANKS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            placeholder="이름/군번 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-[200px] rounded-[4px]"
          />
          <Button
            variant="outline"
            size="sm"
            className="rounded-[4px]"
            onClick={handleSearch}
          >
            검색
          </Button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="border rounded-[4px] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead className="w-[120px]">군번</TableHead>
              <TableHead className="w-[80px]">계급</TableHead>
              <TableHead className="w-[100px]">역할</TableHead>
              <TableHead>소속</TableHead>
              <TableHead className="w-[80px]">상태</TableHead>
              <TableHead className="w-[110px]">등록일</TableHead>
              <TableHead className="w-[60px]">수정</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  데이터가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.militaryNumber ?? '-'}</TableCell>
                  <TableCell>{user.rank ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-[2px]">
                      {ROLE_LABELS[user.role as UserRole] ?? user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.storeName ?? user.tailorName ?? user.unit ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.isActive ? 'default' : 'destructive'}
                      className="rounded-[2px]"
                    >
                      {user.isActive ? '활성' : '비활성'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <a
                      href={`/admin/users/${user.id}`}
                      className="text-sm text-[#1a3a5c] hover:underline"
                    >
                      수정
                    </a>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          총 {totalCount}건
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="rounded-[4px]"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            이전
          </Button>
          <span className="px-3 text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-[4px]"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  )
}
