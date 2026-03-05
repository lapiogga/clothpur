"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  grantPointAction,
  bulkGrantAnnualPointsAction,
} from '@/actions/points-admin'

interface UserOption {
  id: string
  name: string
  rank: string | null
  unit: string | null
  availablePoints: number
}

interface GrantPointsClientProps {
  users: UserOption[]
  currentYear: number
}

const singleGrantSchema = z.object({
  userId: z.string().min(1, '사용자를 선택하세요'),
  amount: z.coerce.number().int().positive('금액은 0보다 커야 합니다'),
  description: z.string().min(1, '설명을 입력하세요'),
})
type SingleGrantData = z.infer<typeof singleGrantSchema>

export function GrantPointsClient({ users, currentYear }: GrantPointsClientProps) {
  const [bulkYear, setBulkYear] = useState(String(currentYear))
  const [bulkLoading, setBulkLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SingleGrantData>({
    resolver: zodResolver(singleGrantSchema),
  })

  async function onSingleGrant(data: SingleGrantData) {
    const result = await grantPointAction({
      ...data,
      referenceType: 'manual',
    })
    if (result.success) {
      toast.success('포인트가 지급되었습니다')
      reset()
    } else {
      toast.error(result.error ?? '지급에 실패했습니다')
    }
  }

  async function handleBulkGrant() {
    const year = parseInt(bulkYear, 10)
    if (isNaN(year) || year < 2020 || year > 2100) {
      toast.error('올바른 연도를 입력하세요')
      return
    }
    setBulkLoading(true)
    const result = await bulkGrantAnnualPointsAction({ fiscalYear: year })
    setBulkLoading(false)
    if (result.success) {
      toast.success(`${result.count}명에게 ${year}년도 연간 포인트를 지급했습니다`)
    } else {
      toast.error(result.error ?? '일괄 지급에 실패했습니다')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1a3a5c]">포인트 지급</h2>

      {/* 연간 일괄 지급 */}
      <Card className="rounded-[4px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">연간 일괄 지급</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            계급별 연간 피복포인트를 전체 활성 사용자에게 일괄 지급합니다. 동일 연도 중복 지급은 방지됩니다.
          </p>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulkYear">회계연도</Label>
              <Input
                id="bulkYear"
                type="number"
                value={bulkYear}
                onChange={(e) => setBulkYear(e.target.value)}
                className="rounded-[4px] w-28"
                min={2020}
                max={2100}
              />
            </div>
            <Button
              className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
              onClick={handleBulkGrant}
              disabled={bulkLoading}
            >
              {bulkLoading ? '처리 중...' : '일괄 지급'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 개별 지급 */}
      <Card className="rounded-[4px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">개별 지급</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSingleGrant)} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="userId">사용자</Label>
              <select
                id="userId"
                {...register('userId')}
                className="w-full border border-input rounded-[4px] px-3 py-2 text-sm bg-background"
              >
                <option value="">-- 사용자 선택 --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.rank ? ` (${u.rank})` : ''}{u.unit ? ` - ${u.unit}` : ''} | 잔여 {u.availablePoints.toLocaleString()}
                  </option>
                ))}
              </select>
              {errors.userId && <p className="text-sm text-red-500">{errors.userId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">지급 금액 (원)</Label>
              <Input
                id="amount"
                type="number"
                {...register('amount')}
                className="rounded-[4px]"
                placeholder="예: 100000"
              />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">지급 사유</Label>
              <Input
                id="description"
                {...register('description')}
                className="rounded-[4px]"
                placeholder="예: 하사 진급 추가 지급"
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
            </div>
            <Button
              type="submit"
              className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? '처리 중...' : '지급'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
