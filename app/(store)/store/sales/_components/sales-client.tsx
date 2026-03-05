"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { searchUsersForSaleAction, createOfflineOrderAction } from '@/actions/orders-store'

interface ProductSpec {
  id: string
  specName: string
}

interface ProductOption {
  id: string
  name: string
  price: number
  productType: 'finished' | 'custom'
  specs: ProductSpec[]
  availableQuantity: Record<string, number>
}

interface SalesClientProps {
  products: ProductOption[]
}

interface FoundUser {
  id: string
  name: string
  rank: string | null
  unit: string | null
  militaryNumber: string | null
}

interface CartItem {
  productId: string
  productName: string
  productType: 'finished' | 'custom'
  specId: string | null
  specName: string | null
  quantity: number
  unitPrice: number
}

function formatPoints(n: number) {
  return n.toLocaleString('ko-KR')
}

export function SalesClient({ products }: SalesClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [foundUsers, setFoundUsers] = useState<FoundUser[]>([])
  const [selectedUser, setSelectedUser] = useState<FoundUser | null>(null)
  const [searching, setSearching] = useState(false)

  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedSpecId, setSelectedSpecId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null)

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const selectedProduct = products.find(p => p.id === selectedProductId)

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    const result = await searchUsersForSaleAction(searchQuery)
    setSearching(false)
    if (result.success) {
      setFoundUsers(result.users)
      if (result.users.length === 0) toast.info('검색 결과가 없습니다')
    } else {
      toast.error(result.error ?? '검색에 실패했습니다')
    }
  }

  function addToCart() {
    if (!selectedProduct) return
    if (selectedProduct.productType === 'finished' && selectedProduct.specs.length > 0 && !selectedSpecId) {
      toast.error('규격을 선택하세요')
      return
    }
    const specName = selectedProduct.specs.find(s => s.id === selectedSpecId)?.specName ?? null

    const existing = cart.find(c => c.productId === selectedProductId && c.specId === (selectedSpecId || null))
    if (existing) {
      setCart(prev => prev.map(c =>
        c.productId === selectedProductId && c.specId === (selectedSpecId || null)
          ? { ...c, quantity: c.quantity + quantity }
          : c
      ))
    } else {
      setCart(prev => [...prev, {
        productId: selectedProductId,
        productName: selectedProduct.name,
        productType: selectedProduct.productType,
        specId: selectedSpecId || null,
        specName,
        quantity,
        unitPrice: selectedProduct.price,
      }])
    }
    setSelectedProductId('')
    setSelectedSpecId('')
    setQuantity(1)
  }

  async function handleSale() {
    if (!selectedUser) { toast.error('고객을 선택하세요'); return }
    if (cart.length === 0) { toast.error('품목을 추가하세요'); return }
    setProcessing(true)
    const result = await createOfflineOrderAction({
      userId: selectedUser.id,
      items: cart.map(c => ({ productId: c.productId, specId: c.specId, quantity: c.quantity })),
    })
    setProcessing(false)
    if (result.success) {
      toast.success(`판매 완료. 주문번호: ${result.orderNumber}`)
      setLastOrderNumber(result.orderNumber ?? null)
      setCart([])
      setSelectedUser(null)
      setFoundUsers([])
      setSearchQuery('')
    } else {
      toast.error(result.error ?? '판매 처리에 실패했습니다')
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">오프라인 판매</h2>

      {lastOrderNumber && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-[4px] text-sm text-green-800">
          최근 판매 완료: <strong>{lastOrderNumber}</strong>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 고객 검색 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">1. 고객 검색</h3>
          <div className="flex gap-2 mb-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="이름 또는 군번 검색"
              className="rounded-[4px]"
            />
            <Button
              className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white shrink-0"
              onClick={handleSearch}
              disabled={searching}
            >
              {searching ? '검색 중...' : '검색'}
            </Button>
          </div>
          {foundUsers.length > 0 && (
            <div className="border rounded-[4px] bg-white divide-y">
              {foundUsers.map(u => (
                <button
                  key={u.id}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${selectedUser?.id === u.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedUser(u)}
                >
                  <span className="font-medium">{u.name}</span>
                  {u.rank && <span className="ml-2 text-muted-foreground">{u.rank}</span>}
                  {u.unit && <span className="ml-2 text-muted-foreground">{u.unit}</span>}
                  {u.militaryNumber && <span className="ml-2 text-xs text-muted-foreground">{u.militaryNumber}</span>}
                </button>
              ))}
            </div>
          )}
          {selectedUser && (
            <Card className="rounded-[4px] mt-2 bg-blue-50 border-blue-200">
              <CardContent className="py-3 px-4">
                <p className="text-sm font-semibold text-[#1a3a5c]">
                  선택된 고객: {selectedUser.name} {selectedUser.rank ? `(${selectedUser.rank})` : ''}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 품목 추가 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">2. 품목 선택</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>품목</Label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value)
                  setSelectedSpecId('')
                }}
                className="w-full border border-input rounded-[4px] px-3 py-2 text-sm bg-background"
              >
                <option value="">-- 품목 선택 --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.productType === 'custom' ? '맞춤' : '완제품'}) - {formatPoints(p.price)}원
                  </option>
                ))}
              </select>
            </div>
            {selectedProduct && selectedProduct.specs.length > 0 && (
              <div className="space-y-1.5">
                <Label>규격</Label>
                <select
                  value={selectedSpecId}
                  onChange={(e) => setSelectedSpecId(e.target.value)}
                  className="w-full border border-input rounded-[4px] px-3 py-2 text-sm bg-background"
                >
                  <option value="">-- 규격 선택 --</option>
                  {selectedProduct.specs.map(s => (
                    <option key={s.id} value={s.id}>{s.specName}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="space-y-1.5 flex-1">
                <Label>수량</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="rounded-[4px]"
                  min={1}
                />
              </div>
              <Button
                className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
                onClick={addToCart}
                disabled={!selectedProductId}
              >
                추가
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 장바구니 + 결제 */}
      {cart.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">3. 판매 확정</h3>
          <div className="border rounded-[4px] bg-white mb-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>품목</TableHead>
                  <TableHead className="w-[80px]">구분</TableHead>
                  <TableHead className="w-[80px]">규격</TableHead>
                  <TableHead className="w-[60px] text-right">수량</TableHead>
                  <TableHead className="w-[100px] text-right">금액</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">{item.productName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-[2px] text-xs">
                        {item.productType === 'custom' ? '맞춤' : '완제품'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{item.specName ?? '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPoints(item.unitPrice * item.quantity)}</TableCell>
                    <TableCell>
                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}
                      >
                        삭제
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              합계: <span className="tabular-nums text-[#1a3a5c]">{formatPoints(cartTotal)}원</span>
            </div>
            <Button
              className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
              onClick={handleSale}
              disabled={processing || !selectedUser}
            >
              {processing ? '처리 중...' : '판매 완료'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
