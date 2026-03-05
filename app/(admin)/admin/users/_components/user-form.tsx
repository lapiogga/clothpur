"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createUser, updateUser } from '@/actions/users'
import type { Rank } from '@/types'

const RANKS: Rank[] = [
  '이병', '일병', '상병', '병장',
  '하사', '중사', '상사', '원사', '준위',
  '소위', '중위', '대위', '소령', '중령', '대령',
  '준장', '소장', '중장', '대장',
]

const ROLES = [
  { value: 'admin', label: '군수담당자' },
  { value: 'store', label: '판매소 담당자' },
  { value: 'tailor', label: '체척업체 담당자' },
  { value: 'user', label: '일반사용자' },
]

const userFormSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요').max(50, '최대 50자'),
  email: z.string().email('올바른 이메일 형식을 입력하세요'),
  role: z.enum(['admin', 'store', 'tailor', 'user'], { required_error: '역할을 선택하세요' }),
  rank: z.string().optional(),
  militaryNumber: z.string().max(30).optional(),
  unit: z.string().max(100).optional(),
  enlistDate: z.string().optional(),
  promotionDate: z.string().optional(),
  retirementDate: z.string().optional(),
  storeId: z.string().optional(),
  tailorId: z.string().optional(),
  isActive: z.boolean().optional(),
})

type UserFormData = z.infer<typeof userFormSchema>

interface StoreOption {
  id: string
  name: string
}

interface UserFormProps {
  mode: 'create' | 'edit'
  defaultValues?: Partial<UserFormData> & { id?: string }
  stores: StoreOption[]
  tailors: StoreOption[]
}

export function UserForm({ mode, defaultValues, stores, tailors }: UserFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      email: defaultValues?.email ?? '',
      role: defaultValues?.role ?? undefined,
      rank: defaultValues?.rank ?? '',
      militaryNumber: defaultValues?.militaryNumber ?? '',
      unit: defaultValues?.unit ?? '',
      enlistDate: defaultValues?.enlistDate ?? '',
      promotionDate: defaultValues?.promotionDate ?? '',
      retirementDate: defaultValues?.retirementDate ?? '',
      storeId: defaultValues?.storeId ?? '',
      tailorId: defaultValues?.tailorId ?? '',
      isActive: defaultValues?.isActive ?? true,
    },
  })

  const selectedRole = watch('role')

  async function onSubmit(data: UserFormData) {
    setIsSubmitting(true)
    try {
      if (mode === 'create') {
        const result = await createUser({
          email: data.email,
          name: data.name,
          role: data.role,
          rank: data.rank || null,
          militaryNumber: data.militaryNumber || null,
          unit: data.unit || null,
          enlistDate: data.enlistDate || null,
          promotionDate: data.promotionDate || null,
          retirementDate: data.retirementDate || null,
          storeId: data.storeId || null,
          tailorId: data.tailorId || null,
        })
        if (result.success) {
          toast.success('사용자가 등록되었습니다.')
          router.push('/admin/users')
        } else {
          toast.error(result.error ?? '등록에 실패했습니다.')
        }
      } else {
        const result = await updateUser({
          id: defaultValues!.id!,
          name: data.name,
          rank: data.rank || null,
          militaryNumber: data.militaryNumber || null,
          unit: data.unit || null,
          enlistDate: data.enlistDate || null,
          promotionDate: data.promotionDate || null,
          retirementDate: data.retirementDate || null,
          storeId: data.storeId || null,
          tailorId: data.tailorId || null,
          isActive: data.isActive ?? true,
        })
        if (result.success) {
          toast.success('사용자 정보가 수정되었습니다.')
          router.push('/admin/users')
        } else {
          toast.error(result.error ?? '수정에 실패했습니다.')
        }
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* 기본 정보 */}
      <Card className="rounded-[4px]">
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input id="name" {...register('name')} className="rounded-[4px]" />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className="rounded-[4px]"
                readOnly={mode === 'edit'}
                disabled={mode === 'edit'}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>역할 *</Label>
              {mode === 'edit' ? (
                <Input
                  value={ROLES.find((r) => r.value === defaultValues?.role)?.label ?? ''}
                  readOnly
                  disabled
                  className="rounded-[4px]"
                />
              ) : (
                <Select
                  value={selectedRole}
                  onValueChange={(v) => setValue('role', v as UserFormData['role'], { shouldValidate: true })}
                >
                  <SelectTrigger className="rounded-[4px]">
                    <SelectValue placeholder="역할 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
            </div>

            {(selectedRole === 'user' || defaultValues?.role === 'user') && (
              <div className="space-y-2">
                <Label>계급</Label>
                <Select
                  value={watch('rank') || ''}
                  onValueChange={(v) => setValue('rank', v)}
                >
                  <SelectTrigger className="rounded-[4px]">
                    <SelectValue placeholder="계급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {RANKS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="militaryNumber">군번</Label>
              <Input id="militaryNumber" {...register('militaryNumber')} className="rounded-[4px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">소속</Label>
              <Input id="unit" {...register('unit')} className="rounded-[4px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 부가 정보 */}
      <Card className="rounded-[4px]">
        <CardHeader>
          <CardTitle className="text-base">부가 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="enlistDate">입대일</Label>
              <Input id="enlistDate" type="date" {...register('enlistDate')} className="rounded-[4px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promotionDate">진급일</Label>
              <Input id="promotionDate" type="date" {...register('promotionDate')} className="rounded-[4px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retirementDate">퇴직예정일</Label>
              <Input id="retirementDate" type="date" {...register('retirementDate')} className="rounded-[4px]" />
            </div>
          </div>

          {(selectedRole === 'store' || defaultValues?.role === 'store') && (
            <div className="space-y-2">
              <Label>소속 판매소 {mode === 'create' && selectedRole === 'store' ? '*' : ''}</Label>
              <Select
                value={watch('storeId') || ''}
                onValueChange={(v) => setValue('storeId', v)}
              >
                <SelectTrigger className="rounded-[4px]">
                  <SelectValue placeholder="판매소 선택" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(selectedRole === 'tailor' || defaultValues?.role === 'tailor') && (
            <div className="space-y-2">
              <Label>소속 업체 {mode === 'create' && selectedRole === 'tailor' ? '*' : ''}</Label>
              <Select
                value={watch('tailorId') || ''}
                onValueChange={(v) => setValue('tailorId', v)}
              >
                <SelectTrigger className="rounded-[4px]">
                  <SelectValue placeholder="업체 선택" />
                </SelectTrigger>
                <SelectContent>
                  {tailors.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === 'edit' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={watch('isActive')}
                onChange={(e) => setValue('isActive', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isActive">활성 상태</Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 버튼 */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-[4px]"
          onClick={() => router.push('/admin/users')}
        >
          취소
        </Button>
        <Button
          type="submit"
          className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d]"
          disabled={isSubmitting}
        >
          {isSubmitting ? '처리 중...' : mode === 'create' ? '등록' : '저장'}
        </Button>
      </div>
    </form>
  )
}
