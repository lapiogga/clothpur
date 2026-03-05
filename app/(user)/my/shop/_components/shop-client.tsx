"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Label } from '@/components/ui/label'
import { createOnlineOrderAction } from '@/actions/orders-user'

interface ProductSpec {
  id: string
  specName: string
}

interface Product {
  id: string
  name: string
  categoryName: string
  productType: 'finished' | 'custom'
  price: number
  specs: ProductSpec[]
}

interface StoreOption {
  id: string
  name: string
}

interface ShopClientProps {
  products: Product[]
  stores: StoreOption[]
  availablePoints: number
}

interface CartItem {
  product: Product
  specId: string | null
  specName: string | null
  quantity: number
}

function formatPoints(n: number) {
  return n.toLocaleString('ko-KR')
}

export function ShopClient({ products, stores, availablePoints }: ShopClientProps) {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSpecId, setSelectedSpecId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [ordering, setOrdering] = useState(false)

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  function openProduct(product: Product) {
    setSelectedProduct(product)
    setSelectedSpecId(product.specs[0]?.id ?? '')
    setQuantity(1)
  }

  function addToCart() {
    if (!selectedProduct) return
    if (selectedProduct.productType === 'finished' && selectedProduct.specs.length > 0 && !selectedSpecId) {
      toast.error('규격을 선택하세요')
      return
    }
    const specName = selectedProduct.specs.find(s => s.id === selectedSpecId)?.specName ?? null
    const existing = cart.find(
      c => c.product.id === selectedProduct.id && c.specId === (selectedSpecId || null)
    )
    if (existing) {
      setCart(prev => prev.map(c =>
        c.product.id === selectedProduct.id && c.specId === (selectedSpecId || null)
          ? { ...c, quantity: c.quantity + quantity }
          : c
      ))
    } else {
      setCart(prev => [...prev, {
        product: selectedProduct,
        specId: selectedSpecId || null,
        specName,
        quantity,
      }])
    }
    toast.success('장바구니에 추가되었습니다')
    setSelectedProduct(null)
  }

  function removeFromCart(idx: number) {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleOrder() {
    if (!selectedStoreId) {
      toast.error('배송 판매소를 선택하세요')
      return
    }
    if (cartTotal > availablePoints) {
      toast.error('포인트가 부족합니다')
      return
    }
    setOrdering(true)
    const result = await createOnlineOrderAction({
      items: cart.map(c => ({
        productId: c.product.id,
        specId: c.specId,
        quantity: c.quantity,
      })),
      storeId: selectedStoreId,
      deliveryAddress,
    })
    setOrdering(false)
    if (result.success) {
      toast.success(`주문이 완료되었습니다. 주문번호: ${result.orderNumber}`)
      setCart([])
      setCheckoutOpen(false)
      router.push('/my/orders')
    } else {
      toast.error(result.error ?? '주문에 실패했습니다')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1a3a5c]">쇼핑</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            잔여 포인트: <strong className="text-[#1a3a5c]">{formatPoints(availablePoints)}</strong>
          </span>
          {cart.length > 0 && (
            <Button
              className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
              onClick={() => setCheckoutOpen(true)}
            >
              장바구니 ({cart.length}) · {formatPoints(cartTotal)}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <Card
            key={product.id}
            className="rounded-[4px] cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openProduct(product)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-semibold">{product.name}</CardTitle>
                <Badge
                  variant={product.productType === 'custom' ? 'default' : 'secondary'}
                  className="rounded-[2px] text-xs shrink-0 ml-2"
                >
                  {product.productType === 'custom' ? '맞춤' : '완제품'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{product.categoryName}</p>
            </CardHeader>
            <CardContent>
              <p className="text-base font-bold tabular-nums text-[#1a3a5c]">
                {formatPoints(product.price)}원
              </p>
            </CardContent>
          </Card>
        ))}
        {products.length === 0 && (
          <p className="col-span-3 text-center py-12 text-muted-foreground">
            구매 가능한 품목이 없습니다
          </p>
        )}
      </div>

      {/* 품목 상세 다이얼로그 */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="rounded-[4px] max-w-sm">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">단가</span>
                  <span className="font-bold tabular-nums">{formatPoints(selectedProduct.price)}원</span>
                </div>
                {selectedProduct.specs.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>규격</Label>
                    <select
                      value={selectedSpecId}
                      onChange={(e) => setSelectedSpecId(e.target.value)}
                      className="w-full border border-input rounded-[4px] px-3 py-2 text-sm bg-background"
                    >
                      {selectedProduct.specs.map(s => (
                        <option key={s.id} value={s.id}>{s.specName}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>수량</Label>
                  <div className="flex items-center gap-2">
                    <button
                      className="w-8 h-8 border rounded-[4px] text-sm"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    >-</button>
                    <span className="w-8 text-center tabular-nums">{quantity}</span>
                    <button
                      className="w-8 h-8 border rounded-[4px] text-sm"
                      onClick={() => setQuantity(q => q + 1)}
                    >+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm">소계</span>
                  <span className="font-bold tabular-nums">
                    {formatPoints(selectedProduct.price * quantity)}원
                  </span>
                </div>
                <Button
                  className="w-full rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
                  onClick={addToCart}
                >
                  장바구니 추가
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 장바구니/주문 다이얼로그 */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="rounded-[4px] max-w-lg">
          <DialogHeader>
            <DialogTitle>주문하기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>품목</TableHead>
                  <TableHead className="w-[80px]">규격</TableHead>
                  <TableHead className="w-[50px] text-right">수량</TableHead>
                  <TableHead className="w-[100px] text-right">금액</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">{item.product.name}</TableCell>
                    <TableCell className="text-sm">{item.specName ?? '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPoints(item.product.price * item.quantity)}
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => removeFromCart(idx)}
                      >
                        삭제
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between font-semibold pt-1 border-t">
              <span>합계</span>
              <span className="tabular-nums">{formatPoints(cartTotal)}원</span>
            </div>
            <div className="space-y-1.5">
              <Label>배송 판매소</Label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full border border-input rounded-[4px] px-3 py-2 text-sm bg-background"
              >
                <option value="">-- 판매소 선택 --</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>배송 주소 (선택)</Label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="상세 배송 주소"
                className="w-full border border-input rounded-[4px] px-3 py-2 text-sm bg-background"
              />
            </div>
            {cartTotal > availablePoints && (
              <p className="text-sm text-red-500">
                포인트가 부족합니다. 잔여: {formatPoints(availablePoints)}, 필요: {formatPoints(cartTotal)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-[4px]"
                onClick={() => setCheckoutOpen(false)}
              >
                취소
              </Button>
              <Button
                className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d] text-white"
                onClick={handleOrder}
                disabled={ordering || cartTotal > availablePoints}
              >
                {ordering ? '처리 중...' : '주문 확정'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
