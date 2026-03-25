"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  createDeliveryZoneAction,
  updateDeliveryZoneAction,
  toggleDeliveryZoneAction,
} from '@/actions/delivery-zones'

interface DeliveryZone {
  id: string
  name: string
  address: string | null
  note: string | null
  isActive: boolean
}

interface DeliveryZonesClientProps {
  zones: DeliveryZone[]
}

const EMPTY_FORM = { name: '', address: '', note: '' }

export function DeliveryZonesClient({ zones: initialZones }: DeliveryZonesClientProps) {
  const [zones, setZones] = useState(initialZones)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DeliveryZone | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(zone: DeliveryZone) {
    setEditTarget(zone)
    setForm({ name: zone.name, address: zone.address ?? '', note: zone.note ?? '' })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('배송지명을 입력하세요')
      return
    }
    setSaving(true)
    const data = { name: form.name.trim(), address: form.address.trim() || undefined, note: form.note.trim() || undefined }
    const result = editTarget
      ? await updateDeliveryZoneAction(editTarget.id, data)
      : await createDeliveryZoneAction(data)
    setSaving(false)

    if (!result.success) {
      toast.error(result.error ?? '저장에 실패했습니다')
      return
    }
    toast.success(editTarget ? '배송지가 수정되었습니다' : '배송지가 등록되었습니다')
    setDialogOpen(false)
    // 로컬 상태 갱신
    if (editTarget) {
      setZones(prev => prev.map(z => z.id === editTarget.id ? { ...z, ...data, address: data.address ?? null, note: data.note ?? null } : z))
    } else {
      // 새 항목은 임시 ID로 추가 (서버 리로드 전까지)
      setZones(prev => [...prev, { id: crypto.randomUUID(), ...data, address: data.address ?? null, note: data.note ?? null, isActive: true }])
    }
  }

  async function handleToggle(zone: DeliveryZone) {
    const result = await toggleDeliveryZoneAction(zone.id)
    if (!result.success) {
      toast.error(result.error ?? '변경에 실패했습니다')
      return
    }
    setZones(prev => prev.map(z => z.id === zone.id ? { ...z, isActive: !z.isActive } : z))
    toast.success(zone.isActive ? '비활성화되었습니다' : '활성화되었습니다')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1a3a5c]">직접배송 배송지 관리</h2>
        <Button
          className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
          onClick={openCreate}
        >
          배송지 추가
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        온라인 주문 시 직접배송 방식을 선택하는 구매자에게 제공될 배송지 목록입니다.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>배송지명</TableHead>
            <TableHead>주소</TableHead>
            <TableHead>비고</TableHead>
            <TableHead className="w-[80px] text-center">상태</TableHead>
            <TableHead className="w-[120px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.map(zone => (
            <TableRow key={zone.id}>
              <TableCell className="font-medium">{zone.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{zone.address ?? '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{zone.note ?? '-'}</TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={zone.isActive ? 'default' : 'secondary'}
                  className="rounded-[2px] text-xs"
                >
                  {zone.isActive ? '활성' : '비활성'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-[4px] h-7 px-2 text-xs"
                    onClick={() => openEdit(zone)}
                  >
                    수정
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-[4px] h-7 px-2 text-xs"
                    onClick={() => handleToggle(zone)}
                  >
                    {zone.isActive ? '비활성화' : '활성화'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {zones.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                등록된 배송지가 없습니다. 배송지를 추가하세요.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[4px] max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? '배송지 수정' : '배송지 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>배송지명 <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="예: ○○대대 본부"
                className="rounded-[4px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>주소</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="배송 주소"
                className="rounded-[4px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>비고</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="배송 관련 참고 사항"
                className="rounded-[4px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-[4px]" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button
                className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
