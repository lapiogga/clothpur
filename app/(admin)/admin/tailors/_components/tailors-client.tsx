"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  createTailorAction,
  updateTailorAction,
  toggleTailorActiveAction,
} from '@/actions/tailors-admin'

const tailorFormSchema = z.object({
  name: z.string().min(1, '업체명은 필수입니다'),
  businessNumber: z.string().optional(),
  representative: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
})

type TailorFormData = z.infer<typeof tailorFormSchema>

interface TailorRow {
  id: string
  name: string
  businessNumber: string | null
  representative: string | null
  address: string | null
  phone: string | null
  bankName: string | null
  accountNumber: string | null
  accountHolder: string | null
  isActive: boolean
  createdAt: number
}

interface TailorsClientProps {
  tailors: TailorRow[]
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

export function TailorsClient({ tailors: initialTailors }: TailorsClientProps) {
  const [tailors, setTailors] = useState(initialTailors)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TailorRow | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TailorFormData>({
    resolver: zodResolver(tailorFormSchema),
  })

  function openCreate() {
    setEditTarget(null)
    reset({
      name: '',
      businessNumber: '',
      representative: '',
      address: '',
      phone: '',
      bankName: '',
      accountNumber: '',
      accountHolder: '',
    })
    setDialogOpen(true)
  }

  function openEdit(tailor: TailorRow) {
    setEditTarget(tailor)
    reset({
      name: tailor.name,
      businessNumber: tailor.businessNumber ?? '',
      representative: tailor.representative ?? '',
      address: tailor.address ?? '',
      phone: tailor.phone ?? '',
      bankName: tailor.bankName ?? '',
      accountNumber: tailor.accountNumber ?? '',
      accountHolder: tailor.accountHolder ?? '',
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: TailorFormData) {
    if (editTarget) {
      const result = await updateTailorAction({ id: editTarget.id, ...data })
      if (result.success) {
        toast.success('체척업체 정보가 수정되었습니다')
        setTailors((prev) =>
          prev.map((t) => (t.id === editTarget.id ? { ...t, ...data } : t))
        )
        setDialogOpen(false)
      } else {
        toast.error(result.error ?? '수정에 실패했습니다')
      }
    } else {
      const result = await createTailorAction(data)
      if (result.success) {
        toast.success('체척업체가 등록되었습니다')
        setDialogOpen(false)
        window.location.reload()
      } else {
        toast.error(result.error ?? '등록에 실패했습니다')
      }
    }
  }

  async function handleToggleActive(tailor: TailorRow) {
    const next = !tailor.isActive
    const result = await toggleTailorActiveAction(tailor.id, next)
    if (result.success) {
      toast.success(next ? '활성화되었습니다' : '비활성화되었습니다')
      setTailors((prev) =>
        prev.map((t) => (t.id === tailor.id ? { ...t, isActive: next } : t))
      )
    } else {
      toast.error(result.error ?? '처리에 실패했습니다')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1a3a5c]">체척업체 관리</h2>
        <Button
          className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
          onClick={openCreate}
        >
          업체 추가
        </Button>
      </div>

      <div className="border rounded-[4px] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>업체명</TableHead>
              <TableHead className="w-[130px]">사업자번호</TableHead>
              <TableHead className="w-[90px]">대표자</TableHead>
              <TableHead>주소</TableHead>
              <TableHead className="w-[130px]">전화번호</TableHead>
              <TableHead className="w-[80px]">상태</TableHead>
              <TableHead className="w-[120px]">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tailors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  등록된 체척업체가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              tailors.map((tailor) => (
                <TableRow key={tailor.id}>
                  <TableCell className="font-medium">{tailor.name}</TableCell>
                  <TableCell>{tailor.businessNumber ?? '-'}</TableCell>
                  <TableCell>{tailor.representative ?? '-'}</TableCell>
                  <TableCell>{tailor.address ?? '-'}</TableCell>
                  <TableCell>{tailor.phone ?? '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={tailor.isActive ? 'default' : 'secondary'}
                      className="rounded-[2px]"
                    >
                      {tailor.isActive ? '활성' : '비활성'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-sm text-[#1a3a5c] hover:underline"
                        onClick={() => openEdit(tailor)}
                      >
                        수정
                      </button>
                      <button
                        className="text-sm text-gray-500 hover:underline"
                        onClick={() => handleToggleActive(tailor)}
                      >
                        {tailor.isActive ? '비활성화' : '활성화'}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[4px] max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? '체척업체 수정' : '체척업체 추가'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">업체명 *</Label>
              <Input id="name" {...register('name')} className="rounded-[4px]" />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessNumber">사업자번호</Label>
                <Input id="businessNumber" {...register('businessNumber')} className="rounded-[4px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="representative">대표자</Label>
                <Input id="representative" {...register('representative')} className="rounded-[4px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input id="address" {...register('address')} className="rounded-[4px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input id="phone" {...register('phone')} className="rounded-[4px]" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">은행명</Label>
                <Input id="bankName" {...register('bankName')} className="rounded-[4px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">계좌번호</Label>
                <Input id="accountNumber" {...register('accountNumber')} className="rounded-[4px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountHolder">예금주</Label>
                <Input id="accountHolder" {...register('accountHolder')} className="rounded-[4px]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-[4px]"
                onClick={() => setDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리 중...' : editTarget ? '저장' : '등록'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
