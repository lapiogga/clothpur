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
  createStoreAction,
  updateStoreAction,
  toggleStoreActiveAction,
} from '@/actions/stores-admin'

const storeFormSchema = z.object({
  name: z.string().min(1, '판매소명은 필수입니다'),
  address: z.string().optional(),
  phone: z.string().optional(),
  managerName: z.string().optional(),
})

type StoreFormData = z.infer<typeof storeFormSchema>

interface StoreRow {
  id: string
  name: string
  address: string | null
  phone: string | null
  managerName: string | null
  isActive: boolean
  createdAt: number
}

interface StoresClientProps {
  stores: StoreRow[]
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

export function StoresClient({ stores: initialStores }: StoresClientProps) {
  const [stores, setStores] = useState(initialStores)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StoreRow | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeFormSchema),
  })

  function openCreate() {
    setEditTarget(null)
    reset({ name: '', address: '', phone: '', managerName: '' })
    setDialogOpen(true)
  }

  function openEdit(store: StoreRow) {
    setEditTarget(store)
    reset({
      name: store.name,
      address: store.address ?? '',
      phone: store.phone ?? '',
      managerName: store.managerName ?? '',
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: StoreFormData) {
    if (editTarget) {
      const result = await updateStoreAction({ id: editTarget.id, ...data })
      if (result.success) {
        toast.success('판매소 정보가 수정되었습니다')
        setStores((prev) =>
          prev.map((s) =>
            s.id === editTarget.id
              ? { ...s, ...data }
              : s
          )
        )
        setDialogOpen(false)
      } else {
        toast.error(result.error ?? '수정에 실패했습니다')
      }
    } else {
      const result = await createStoreAction(data)
      if (result.success) {
        toast.success('판매소가 등록되었습니다')
        setDialogOpen(false)
        // 페이지 새로고침으로 서버 데이터 반영
        window.location.reload()
      } else {
        toast.error(result.error ?? '등록에 실패했습니다')
      }
    }
  }

  async function handleToggleActive(store: StoreRow) {
    const next = !store.isActive
    const result = await toggleStoreActiveAction(store.id, next)
    if (result.success) {
      toast.success(next ? '활성화되었습니다' : '비활성화되었습니다')
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, isActive: next } : s))
      )
    } else {
      toast.error(result.error ?? '처리에 실패했습니다')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1a3a5c]">판매소 관리</h2>
        <Button
          className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
          onClick={openCreate}
        >
          판매소 추가
        </Button>
      </div>

      <div className="border rounded-[4px] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>판매소명</TableHead>
              <TableHead>주소</TableHead>
              <TableHead className="w-[130px]">전화번호</TableHead>
              <TableHead className="w-[100px]">담당자</TableHead>
              <TableHead className="w-[80px]">상태</TableHead>
              <TableHead className="w-[110px]">등록일</TableHead>
              <TableHead className="w-[120px]">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  등록된 판매소가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>{store.address ?? '-'}</TableCell>
                  <TableCell>{store.phone ?? '-'}</TableCell>
                  <TableCell>{store.managerName ?? '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={store.isActive ? 'default' : 'secondary'}
                      className="rounded-[2px]"
                    >
                      {store.isActive ? '활성' : '비활성'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(store.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-sm text-[#1a3a5c] hover:underline"
                        onClick={() => openEdit(store)}
                      >
                        수정
                      </button>
                      <button
                        className="text-sm text-gray-500 hover:underline"
                        onClick={() => handleToggleActive(store)}
                      >
                        {store.isActive ? '비활성화' : '활성화'}
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
        <DialogContent className="rounded-[4px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? '판매소 수정' : '판매소 추가'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">판매소명 *</Label>
              <Input id="name" {...register('name')} className="rounded-[4px]" />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input id="address" {...register('address')} className="rounded-[4px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input id="phone" {...register('phone')} className="rounded-[4px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerName">담당자</Label>
              <Input id="managerName" {...register('managerName')} className="rounded-[4px]" />
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
