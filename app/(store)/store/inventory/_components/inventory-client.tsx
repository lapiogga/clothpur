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
import { incomingInventoryAction, adjustInventoryAction } from '@/actions/inventory'

interface ProductSpec {
  id: string
  specName: string
}

interface ProductOption {
  id: string
  name: string
  specs: ProductSpec[]
}

interface InventoryRow {
  id: string
  productId: string
  productName: string
  specId: string
  specName: string
  quantity: number
}

interface InventoryClientProps {
  storeId: string
  storeName: string
  inventory: InventoryRow[]
  products: ProductOption[]
}

const incomingSchema = z.object({
  productId: z.string().min(1, '품목을 선택하세요'),
  specId: z.string().min(1, '규격을 선택하세요'),
  quantity: z.coerce.number().int().positive('수량은 1 이상이어야 합니다'),
  reason: z.string().optional(),
})
type IncomingData = z.infer<typeof incomingSchema>

const adjustSchema = z.object({
  newQuantity: z.coerce.number().int().min(0, '수량은 0 이상이어야 합니다'),
  reason: z.string().min(1, '조정 사유를 입력하세요'),
})
type AdjustData = z.infer<typeof adjustSchema>

export function InventoryClient({ storeId, storeName, inventory: initialInventory, products }: InventoryClientProps) {
  const [inventory, setInventory] = useState(initialInventory)
  const [incomingOpen, setIncomingOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<InventoryRow | null>(null)
  const [selectedProductId, setSelectedProductId] = useState('')

  const selectedProduct = products.find(p => p.id === selectedProductId)

  const incomingForm = useForm<IncomingData>({ resolver: zodResolver(incomingSchema) })
  const adjustForm = useForm<AdjustData>({ resolver: zodResolver(adjustSchema) })

  async function onIncoming(data: IncomingData) {
    const result = await incomingInventoryAction({ ...data, storeId })
    if (result.success) {
      toast.success('입고 처리되었습니다')
      setIncomingOpen(false)
      incomingForm.reset()
      window.location.reload()
    } else {
      toast.error(result.error ?? '처리에 실패했습니다')
    }
  }

  function openAdjust(row: InventoryRow) {
    setAdjustTarget(row)
    adjustForm.reset({ newQuantity: row.quantity, reason: '' })
  }

  async function onAdjust(data: AdjustData) {
    if (!adjustTarget) return
    const result = await adjustInventoryAction({ inventoryId: adjustTarget.id, ...data })
    if (result.success) {
      toast.success('재고가 조정되었습니다')
      setInventory(prev => prev.map(row =>
        row.id === adjustTarget.id ? { ...row, quantity: data.newQuantity } : row
      ))
      setAdjustTarget(null)
    } else {
      toast.error(result.error ?? '조정에 실패했습니다')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1a3a5c]">
          재고 관리 <span className="text-sm font-normal text-muted-foreground ml-1">({storeName})</span>
        </h2>
        <Button
          className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
          onClick={() => {
            setSelectedProductId('')
            incomingForm.reset()
            setIncomingOpen(true)
          }}
        >
          입고 등록
        </Button>
      </div>

      <div className="border rounded-[4px] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>품목명</TableHead>
              <TableHead className="w-[100px]">규격</TableHead>
              <TableHead className="w-[100px] text-right">재고 수량</TableHead>
              <TableHead className="w-[120px]">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  등록된 재고가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              inventory.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.productName}</TableCell>
                  <TableCell>{row.specName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={row.quantity === 0 ? 'text-red-500' : row.quantity < 5 ? 'text-yellow-600' : ''}>
                      {row.quantity}
                    </span>
                    {row.quantity === 0 && (
                      <Badge variant="destructive" className="rounded-[2px] ml-2 text-xs">품절</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-sm text-[#1a3a5c] hover:underline"
                      onClick={() => openAdjust(row)}
                    >
                      조정
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 입고 다이얼로그 */}
      <Dialog open={incomingOpen} onOpenChange={setIncomingOpen}>
        <DialogContent className="rounded-[4px] max-w-sm">
          <DialogHeader>
            <DialogTitle>입고 등록</DialogTitle>
          </DialogHeader>
          <form onSubmit={incomingForm.handleSubmit(onIncoming)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>품목</Label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value)
                  incomingForm.setValue('productId', e.target.value)
                  incomingForm.setValue('specId', '')
                }}
                className="w-full border border-input rounded-[4px] px-3 py-2 text-sm bg-background"
              >
                <option value="">-- 품목 선택 --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {incomingForm.formState.errors.productId && (
                <p className="text-sm text-red-500">{incomingForm.formState.errors.productId.message}</p>
              )}
            </div>
            {selectedProduct && (
              <div className="space-y-1.5">
                <Label>규격</Label>
                <select
                  {...incomingForm.register('specId')}
                  className="w-full border border-input rounded-[4px] px-3 py-2 text-sm bg-background"
                >
                  <option value="">-- 규격 선택 --</option>
                  {selectedProduct.specs.map(s => (
                    <option key={s.id} value={s.id}>{s.specName}</option>
                  ))}
                </select>
                {incomingForm.formState.errors.specId && (
                  <p className="text-sm text-red-500">{incomingForm.formState.errors.specId.message}</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>수량</Label>
              <Input
                type="number"
                {...incomingForm.register('quantity')}
                className="rounded-[4px]"
                min={1}
              />
              {incomingForm.formState.errors.quantity && (
                <p className="text-sm text-red-500">{incomingForm.formState.errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>사유 (선택)</Label>
              <Input
                {...incomingForm.register('reason')}
                className="rounded-[4px]"
                placeholder="예: 정기 입고"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-[4px]" onClick={() => setIncomingOpen(false)}>
                취소
              </Button>
              <Button
                type="submit"
                className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
                disabled={incomingForm.formState.isSubmitting}
              >
                {incomingForm.formState.isSubmitting ? '처리 중...' : '입고'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 재고 조정 다이얼로그 */}
      <Dialog open={!!adjustTarget} onOpenChange={(open) => !open && setAdjustTarget(null)}>
        <DialogContent className="rounded-[4px] max-w-sm">
          {adjustTarget && (
            <>
              <DialogHeader>
                <DialogTitle>재고 조정</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {adjustTarget.productName} - {adjustTarget.specName} (현재: {adjustTarget.quantity})
              </p>
              <form onSubmit={adjustForm.handleSubmit(onAdjust)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>조정 후 수량</Label>
                  <Input
                    type="number"
                    {...adjustForm.register('newQuantity')}
                    className="rounded-[4px]"
                    min={0}
                  />
                  {adjustForm.formState.errors.newQuantity && (
                    <p className="text-sm text-red-500">{adjustForm.formState.errors.newQuantity.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>조정 사유</Label>
                  <Input
                    {...adjustForm.register('reason')}
                    className="rounded-[4px]"
                    placeholder="예: 재고 실사 후 조정"
                  />
                  {adjustForm.formState.errors.reason && (
                    <p className="text-sm text-red-500">{adjustForm.formState.errors.reason.message}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" className="rounded-[4px]" onClick={() => setAdjustTarget(null)}>
                    취소
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
                    disabled={adjustForm.formState.isSubmitting}
                  >
                    {adjustForm.formState.isSubmitting ? '처리 중...' : '조정'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
