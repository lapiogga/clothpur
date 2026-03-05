"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createCategoryAction,
  updateCategoryAction,
  toggleCategoryActiveAction,
} from '@/actions/products-admin'

interface Category {
  id: string
  name: string
  parentId: string | null
  level: number
  sortOrder: number
  isActive: boolean
}

interface Props {
  level1: Category[]
  level2: Category[]
  level3: Category[]
}

type DialogMode = 'add' | 'edit'

interface DialogState {
  open: boolean
  mode: DialogMode
  targetLevel: number
  parentId: string | null
  editId: string | null
  editName: string
}

const INITIAL_DIALOG: DialogState = {
  open: false,
  mode: 'add',
  targetLevel: 1,
  parentId: null,
  editId: null,
  editName: '',
}

export function CategoriesClient({ level1, level2, level3 }: Props) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>(INITIAL_DIALOG)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  // 대분류 추가
  function openAddLevel1() {
    setDialog({ open: true, mode: 'add', targetLevel: 1, parentId: null, editId: null, editName: '' })
    setName('')
  }

  // 중분류 추가
  function openAddLevel2(parentId: string) {
    setDialog({ open: true, mode: 'add', targetLevel: 2, parentId, editId: null, editName: '' })
    setName('')
  }

  // 소분류 추가
  function openAddLevel3(parentId: string) {
    setDialog({ open: true, mode: 'add', targetLevel: 3, parentId, editId: null, editName: '' })
    setName('')
  }

  // 수정
  function openEdit(cat: Category) {
    setDialog({ open: true, mode: 'edit', targetLevel: cat.level, parentId: cat.parentId, editId: cat.id, editName: cat.name })
    setName(cat.name)
  }

  function closeDialog() {
    setDialog(INITIAL_DIALOG)
    setName('')
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error('분류명을 입력하세요')
      return
    }
    setLoading(true)
    try {
      let result
      if (dialog.mode === 'add') {
        result = await createCategoryAction({
          name: name.trim(),
          parentId: dialog.parentId,
          level: dialog.targetLevel,
          sortOrder: 0,
        })
      } else {
        result = await updateCategoryAction(dialog.editId!, { name: name.trim() })
      }

      if (result.success) {
        toast.success(dialog.mode === 'add' ? '분류가 추가되었습니다' : '분류가 수정되었습니다')
        closeDialog()
        router.refresh()
      } else {
        toast.error(result.error ?? '오류가 발생했습니다')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(cat: Category) {
    const result = await toggleCategoryActiveAction(cat.id, !cat.isActive)
    if (result.success) {
      toast.success(cat.isActive ? '비활성화되었습니다' : '활성화되었습니다')
      router.refresh()
    } else {
      toast.error(result.error ?? '오류가 발생했습니다')
    }
  }

  const levelLabel = dialog.targetLevel === 1 ? '대분류' : dialog.targetLevel === 2 ? '중분류' : '소분류'

  return (
    <div className="space-y-4">
      {/* 대분류 추가 버튼 */}
      <div className="flex justify-end">
        <Button
          className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
          onClick={openAddLevel1}
        >
          대분류 추가
        </Button>
      </div>

      {/* 분류 트리 */}
      <div className="border rounded-[4px] divide-y bg-white">
        {level1.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            등록된 분류가 없습니다
          </div>
        )}
        {level1.map(cat1 => {
          const children2 = level2.filter(c => c.parentId === cat1.id)
          return (
            <div key={cat1.id}>
              {/* 대분류 행 */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#FAF7F2]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1a3a5c]">{cat1.name}</span>
                  <Badge className="rounded-[2px] text-xs bg-zinc-200 text-zinc-700 hover:bg-zinc-200">
                    대분류
                  </Badge>
                  {!cat1.isActive && (
                    <Badge className="rounded-[2px] text-xs bg-red-100 text-red-600 hover:bg-red-100">
                      비활성
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-[4px] text-xs h-7"
                    onClick={() => openAddLevel2(cat1.id)}
                  >
                    중분류 추가
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-[4px] text-xs h-7"
                    onClick={() => openEdit(cat1)}
                  >
                    수정
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`rounded-[4px] text-xs h-7 ${cat1.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                    onClick={() => handleToggle(cat1)}
                  >
                    {cat1.isActive ? '비활성화' : '활성화'}
                  </Button>
                </div>
              </div>

              {/* 중분류 */}
              {children2.map(cat2 => {
                const children3 = level3.filter(c => c.parentId === cat2.id)
                return (
                  <div key={cat2.id}>
                    <div className="flex items-center justify-between px-4 py-2 pl-10 border-t bg-white">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">{cat2.name}</span>
                        <Badge className="rounded-[2px] text-xs bg-zinc-100 text-zinc-600 hover:bg-zinc-100">
                          중분류
                        </Badge>
                        {!cat2.isActive && (
                          <Badge className="rounded-[2px] text-xs bg-red-100 text-red-600 hover:bg-red-100">
                            비활성
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-[4px] text-xs h-7"
                          onClick={() => openAddLevel3(cat2.id)}
                        >
                          소분류 추가
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-[4px] text-xs h-7"
                          onClick={() => openEdit(cat2)}
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`rounded-[4px] text-xs h-7 ${cat2.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                          onClick={() => handleToggle(cat2)}
                        >
                          {cat2.isActive ? '비활성화' : '활성화'}
                        </Button>
                      </div>
                    </div>

                    {/* 소분류 */}
                    {children3.map(cat3 => (
                      <div
                        key={cat3.id}
                        className="flex items-center justify-between px-4 py-2 pl-16 border-t bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{cat3.name}</span>
                          <Badge className="rounded-[2px] text-xs bg-zinc-100 text-zinc-500 hover:bg-zinc-100">
                            소분류
                          </Badge>
                          {!cat3.isActive && (
                            <Badge className="rounded-[2px] text-xs bg-red-100 text-red-600 hover:bg-red-100">
                              비활성
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-[4px] text-xs h-7"
                            onClick={() => openEdit(cat3)}
                          >
                            수정
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`rounded-[4px] text-xs h-7 ${cat3.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                            onClick={() => handleToggle(cat3)}
                          >
                            {cat3.isActive ? '비활성화' : '활성화'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* 추가/수정 다이얼로그 */}
      <Dialog open={dialog.open} onOpenChange={open => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'add' ? `${levelLabel} 추가` : `${levelLabel} 수정`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="cat-name">분류명</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="분류명을 입력하세요"
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                className="rounded-[4px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-[4px]"
              onClick={closeDialog}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
