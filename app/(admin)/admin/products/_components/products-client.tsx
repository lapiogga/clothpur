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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  createProductAction,
  updateProductAction,
  toggleProductActiveAction,
  createSpecAction,
  deleteSpecAction,
} from '@/actions/products-admin'

interface Category {
  id: string
  name: string
  parentId: string | null
  level: number
  sortOrder: number
  isActive: boolean
}

interface Product {
  id: string
  name: string
  categoryId: string
  productType: string
  price: number
  description: string | null
  isActive: boolean
}

interface Spec {
  id: string
  productId: string
  specName: string
  sortOrder: number
  isActive: boolean
}

interface Props {
  categories: Category[]
  products: Product[]
  specs: Spec[]
}

type ProductDialogMode = 'add' | 'edit'

interface ProductDialogState {
  open: boolean
  mode: ProductDialogMode
  editId: string | null
  name: string
  categoryId: string
  productType: 'finished' | 'custom'
  price: string
  description: string
}

const INITIAL_PRODUCT_DIALOG: ProductDialogState = {
  open: false,
  mode: 'add',
  editId: null,
  name: '',
  categoryId: '',
  productType: 'finished',
  price: '',
  description: '',
}

export function ProductsClient({ categories, products, specs }: Props) {
  const router = useRouter()
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all')
  const [productDialog, setProductDialog] = useState<ProductDialogState>(INITIAL_PRODUCT_DIALOG)
  const [specName, setSpecName] = useState('')
  const [loading, setLoading] = useState(false)

  // 분류 필터 (level 1만 목록에서 선택)
  const level1Categories = categories.filter(c => c.level === 1)

  // 필터링된 품목
  const filteredProducts = filterCategoryId === 'all'
    ? products
    : products.filter(p => {
        // 해당 대분류에 속하는 모든 분류 ID 수집
        const cat = categories.find(c => c.id === filterCategoryId)
        if (!cat) return false
        if (cat.level === 1) {
          const level2Ids = categories.filter(c => c.parentId === cat.id).map(c => c.id)
          const level3Ids = categories.filter(c => level2Ids.includes(c.parentId ?? '')).map(c => c.id)
          return [cat.id, ...level2Ids, ...level3Ids].includes(p.categoryId)
        }
        return p.categoryId === cat.id
      })

  // 선택된 품목의 규격
  const selectedProductSpecs = selectedProductId
    ? specs.filter(s => s.productId === selectedProductId)
    : []

  const selectedProduct = selectedProductId
    ? products.find(p => p.id === selectedProductId)
    : null

  // 분류명 찾기
  function getCategoryName(categoryId: string): string {
    const cat = categories.find(c => c.id === categoryId)
    if (!cat) return '-'
    if (cat.level === 1) return cat.name
    const parent = categories.find(c => c.id === cat.parentId)
    if (!parent) return cat.name
    if (parent.level === 1) return `${parent.name} > ${cat.name}`
    const grandParent = categories.find(c => c.id === parent.parentId)
    return grandParent ? `${grandParent.name} > ${parent.name} > ${cat.name}` : `${parent.name} > ${cat.name}`
  }

  function openAddProduct() {
    setProductDialog({ ...INITIAL_PRODUCT_DIALOG, open: true, mode: 'add' })
  }

  function openEditProduct(p: Product) {
    setProductDialog({
      open: true,
      mode: 'edit',
      editId: p.id,
      name: p.name,
      categoryId: p.categoryId,
      productType: p.productType as 'finished' | 'custom',
      price: String(p.price),
      description: p.description ?? '',
    })
  }

  function closeProductDialog() {
    setProductDialog(INITIAL_PRODUCT_DIALOG)
  }

  async function handleProductSubmit() {
    if (!productDialog.name.trim()) {
      toast.error('품목명을 입력하세요')
      return
    }
    if (!productDialog.categoryId) {
      toast.error('분류를 선택하세요')
      return
    }
    const priceNum = parseInt(productDialog.price)
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('올바른 단가를 입력하세요')
      return
    }

    setLoading(true)
    try {
      const data = {
        name: productDialog.name.trim(),
        categoryId: productDialog.categoryId,
        productType: productDialog.productType,
        price: priceNum,
        description: productDialog.description || undefined,
      }

      const result = productDialog.mode === 'add'
        ? await createProductAction(data)
        : await updateProductAction(productDialog.editId!, data)

      if (result.success) {
        toast.success(productDialog.mode === 'add' ? '품목이 추가되었습니다' : '품목이 수정되었습니다')
        closeProductDialog()
        router.refresh()
      } else {
        toast.error(result.error ?? '오류가 발생했습니다')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleProduct(p: Product) {
    const result = await toggleProductActiveAction(p.id, !p.isActive)
    if (result.success) {
      toast.success(p.isActive ? '비활성화되었습니다' : '활성화되었습니다')
      router.refresh()
    } else {
      toast.error(result.error ?? '오류가 발생했습니다')
    }
  }

  async function handleAddSpec() {
    if (!selectedProductId) return
    if (!specName.trim()) {
      toast.error('규격명을 입력하세요')
      return
    }
    const result = await createSpecAction({
      productId: selectedProductId,
      specName: specName.trim(),
      sortOrder: selectedProductSpecs.length,
    })
    if (result.success) {
      toast.success('규격이 추가되었습니다')
      setSpecName('')
      router.refresh()
    } else {
      toast.error(result.error ?? '오류가 발생했습니다')
    }
  }

  async function handleDeleteSpec(id: string) {
    const result = await deleteSpecAction(id)
    if (result.success) {
      toast.success('규격이 삭제되었습니다')
      router.refresh()
    } else {
      toast.error(result.error ?? '오류가 발생했습니다')
    }
  }

  // 분류 Select 옵션 (전체 계층)
  const categoryOptions = categories.filter(c => c.isActive).map(c => {
    let label = c.name
    if (c.level === 2) {
      const p = categories.find(x => x.id === c.parentId)
      label = `${p?.name ?? ''} > ${c.name}`
    } else if (c.level === 3) {
      const p = categories.find(x => x.id === c.parentId)
      const gp = categories.find(x => x.id === p?.parentId)
      label = `${gp?.name ?? ''} > ${p?.name ?? ''} > ${c.name}`
    }
    return { id: c.id, label }
  })

  return (
    <div className="flex gap-4">
      {/* 좌측: 품목 목록 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3 gap-2">
          <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
            <SelectTrigger className="w-48 rounded-[4px] h-9 text-sm">
              <SelectValue placeholder="전체 분류" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 분류</SelectItem>
              {level1Categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white h-9 text-sm"
            onClick={openAddProduct}
          >
            품목 추가
          </Button>
        </div>

        <div className="border rounded-[4px] bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#FAF7F2]">
                <TableHead className="text-xs font-semibold text-[#1a3a5c]">품목명</TableHead>
                <TableHead className="text-xs font-semibold text-[#1a3a5c]">분류</TableHead>
                <TableHead className="text-xs font-semibold text-[#1a3a5c]">유형</TableHead>
                <TableHead className="text-xs font-semibold text-[#1a3a5c] text-right">단가</TableHead>
                <TableHead className="text-xs font-semibold text-[#1a3a5c]">상태</TableHead>
                <TableHead className="text-xs font-semibold text-[#1a3a5c]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    등록된 품목이 없습니다
                  </TableCell>
                </TableRow>
              )}
              {filteredProducts.map(p => (
                <TableRow
                  key={p.id}
                  className={`cursor-pointer ${selectedProductId === p.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setSelectedProductId(p.id)}
                >
                  <TableCell className="text-sm font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-gray-600">{getCategoryName(p.categoryId)}</TableCell>
                  <TableCell>
                    <Badge className={`rounded-[2px] text-xs ${p.productType === 'finished' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-orange-100 text-orange-700 hover:bg-orange-100'}`}>
                      {p.productType === 'finished' ? '완제품' : '맞춤피복'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-right font-variant-numeric tabular-nums">
                    {p.price.toLocaleString()}원
                  </TableCell>
                  <TableCell>
                    <Badge className={`rounded-[2px] text-xs ${p.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-100'}`}>
                      {p.isActive ? '활성' : '비활성'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-[4px] text-xs h-7"
                        onClick={() => openEditProduct(p)}
                      >
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`rounded-[4px] text-xs h-7 ${p.isActive ? 'text-red-600' : 'text-green-600'}`}
                        onClick={() => handleToggleProduct(p)}
                      >
                        {p.isActive ? '비활성화' : '활성화'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 우측: 규격 목록 */}
      <div className="w-72 shrink-0">
        <div className="border rounded-[4px] bg-white p-4">
          <h3 className="text-sm font-semibold text-[#1a3a5c] mb-3">
            {selectedProduct ? `${selectedProduct.name} 규격` : '규격 목록'}
          </h3>

          {!selectedProduct ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              품목을 먼저 선택하세요
            </p>
          ) : (
            <div className="space-y-3">
              {/* 규격 추가 입력 */}
              <div className="flex gap-2">
                <Input
                  value={specName}
                  onChange={e => setSpecName(e.target.value)}
                  placeholder="규격명 (예: 95)"
                  className="rounded-[4px] h-8 text-sm"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddSpec() }}
                />
                <Button
                  className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white h-8 text-xs px-3 shrink-0"
                  onClick={handleAddSpec}
                >
                  추가
                </Button>
              </div>

              {/* 규격 목록 */}
              <div className="space-y-1">
                {selectedProductSpecs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    등록된 규격이 없습니다
                  </p>
                )}
                {selectedProductSpecs.map(spec => (
                  <div
                    key={spec.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-[4px]"
                  >
                    <span className="text-sm">{spec.specName}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-[4px] text-xs h-6 text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteSpec(spec.id)}
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 품목 추가/수정 다이얼로그 */}
      <Dialog open={productDialog.open} onOpenChange={open => { if (!open) closeProductDialog() }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {productDialog.mode === 'add' ? '품목 추가' : '품목 수정'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="product-name">품목명</Label>
              <Input
                id="product-name"
                value={productDialog.name}
                onChange={e => setProductDialog(prev => ({ ...prev, name: e.target.value }))}
                placeholder="품목명을 입력하세요"
                className="rounded-[4px]"
              />
            </div>
            <div className="space-y-1">
              <Label>분류</Label>
              <Select
                value={productDialog.categoryId}
                onValueChange={v => setProductDialog(prev => ({ ...prev, categoryId: v }))}
              >
                <SelectTrigger className="rounded-[4px]">
                  <SelectValue placeholder="분류를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>유형</Label>
              <Select
                value={productDialog.productType}
                onValueChange={v => setProductDialog(prev => ({ ...prev, productType: v as 'finished' | 'custom' }))}
              >
                <SelectTrigger className="rounded-[4px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finished">완제품</SelectItem>
                  <SelectItem value="custom">맞춤피복</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="product-price">단가 (원)</Label>
              <Input
                id="product-price"
                type="number"
                min={0}
                value={productDialog.price}
                onChange={e => setProductDialog(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0"
                className="rounded-[4px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="product-desc">설명 (선택)</Label>
              <Textarea
                id="product-desc"
                value={productDialog.description}
                onChange={e => setProductDialog(prev => ({ ...prev, description: e.target.value }))}
                placeholder="품목 설명을 입력하세요"
                className="rounded-[4px] resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-[4px]"
              onClick={closeProductDialog}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
              onClick={handleProductSubmit}
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
