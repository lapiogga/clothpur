"use client"

import { useState, useMemo } from 'react'
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

interface InventoryItem {
  storeId: string
  specId: string
  productId: string
  quantity: number
}

interface DeliveryZoneOption {
  id: string
  storeId: string
  name: string
  address: string | null
}

interface ShopClientProps {
  products: Product[]
  stores: StoreOption[]
  inventoryData: InventoryItem[]
  deliveryZonesData: DeliveryZoneOption[]
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

export function ShopClient({ products, stores, inventoryData, deliveryZonesData, availablePoints }: ShopClientProps) {
  const router = useRouter()
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSpecId, setSelectedSpecId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState<'parcel' | 'direct'>('parcel')
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [ordering, setOrdering] = useState(false)

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const selectedStore = stores.find(s => s.id === selectedStoreId)

  // 선택된 판매소의 직접배송 배송지 목록
  const storeDeliveryZones = useMemo(
    () => deliveryZonesData.filter(z => z.storeId === selectedStoreId),
    [selectedStoreId, deliveryZonesData]
  )

  // 선택된 판매소의 재고 맵: specId → quantity
  const storeInventoryMap = useMemo(() => {
    if (!selectedStoreId) return new Map<string, number>()
    return new Map(
      inventoryData
        .filter(inv => inv.storeId === selectedStoreId)
        .map(inv => [inv.specId, inv.quantity])
    )
  }, [selectedStoreId, inventoryData])

  // 선택된 판매소에서 구매 가능한 품목 필터링
  // - 맞춤피복: 항상 표시
  // - 완제품: 해당 판매소에 재고 있는 규격이 하나라도 있으면 표시
  const availableProducts = useMemo(() => {
    if (!selectedStoreId) return []
    return products.filter(p => {
      if (p.productType === 'custom') return true
      return p.specs.some(s => (storeInventoryMap.get(s.id) ?? 0) > 0)
    })
  }, [selectedStoreId, products, storeInventoryMap])

  // 품목 다이얼로그 열기 - 완제품은 재고 있는 규격만 표시
  function openProduct(product: Product) {
    const availableSpecs = product.productType === 'finished'
      ? product.specs.filter(s => (storeInventoryMap.get(s.id) ?? 0) > 0)
      : product.specs
    setSelectedProduct({ ...product, specs: availableSpecs })
    setSelectedSpecId(availableSpecs[0]?.id ?? '')
    setQuantity(1)
  }

  // 선택 규격의 재고 수량
  const currentStock = selectedProduct?.productType === 'finished' && selectedSpecId
    ? (storeInventoryMap.get(selectedSpecId) ?? 0)
    : Infinity

  function addToCart() {
    if (!selectedProduct) return
    if (selectedProduct.productType === 'finished' && selectedProduct.specs.length > 0 && !selectedSpecId) {
      toast.error('규격을 선택하세요')
      return
    }
    const existingQty = cart.find(
      c => c.product.id === selectedProduct.id && c.specId === (selectedSpecId || null)
    )?.quantity ?? 0
    if (selectedProduct.productType === 'finished' && existingQty + quantity > currentStock) {
      toast.error(`재고가 부족합니다. 잔여 재고: ${currentStock - existingQty}개`)
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

  function handleStoreChange(storeId: string) {
    if (cart.length > 0) {
      if (!confirm('판매소를 변경하면 장바구니가 초기화됩니다. 계속하시겠습니까?')) return
      setCart([])
    }
    setSelectedStoreId(storeId)
    setDeliveryMethod('parcel')
    setSelectedZoneId('')
    setDeliveryAddress('')
  }

  async function handleOrder() {
    if (cartTotal > availablePoints) {
      toast.error('포인트가 부족합니다')
      return
    }
    if (deliveryMethod === 'direct' && !selectedZoneId) {
      toast.error('직접배송 배송지를 선택하세요')
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
      deliveryMethod,
      deliveryZoneId: deliveryMethod === 'direct' ? selectedZoneId : undefined,
      deliveryAddress: deliveryMethod === 'parcel' ? deliveryAddress : undefined,
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

      {/* 1단계: 판매소 선택 */}
      <div className="mb-6 p-4 border rounded-[4px] bg-muted/30">
        <div className="flex items-center gap-4">
          <Label className="shrink-0 font-semibold">피복판매소 선택</Label>
          <select
            value={selectedStoreId}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="flex-1 border border-input rounded-[4px] px-3 py-2 text-sm bg-background"
          >
            <option value="">-- 판매소를 먼저 선택하세요 --</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {selectedStore && (
            <Badge variant="secondary" className="rounded-[2px] shrink-0">
              {selectedStore.name}
            </Badge>
          )}
        </div>
        {!selectedStoreId && (
          <p className="text-xs text-muted-foreground mt-2">
            구매할 피복판매소를 선택하면 해당 판매소의 재고 기준으로 품목이 표시됩니다.
          </p>
        )}
      </div>

      {/* 2단계: 품목 목록 (판매소 선택 후) */}
      {!selectedStoreId ? (
        <div className="text-center py-16 text-muted-foreground">
          피복판매소를 선택하면 구매 가능한 품목이 표시됩니다.
        </div>
      ) : availableProducts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          선택한 판매소에 구매 가능한 품목이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableProducts.map(product => {
            const availableSpecCount = product.productType === 'finished'
              ? product.specs.filter(s => (storeInventoryMap.get(s.id) ?? 0) > 0).length
              : null
            return (
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
                  {availableSpecCount !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      재고 있는 규격: {availableSpecCount}개
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

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
                      {selectedProduct.specs.map(s => {
                        const stock = storeInventoryMap.get(s.id) ?? 0
                        return (
                          <option key={s.id} value={s.id}>
                            {s.specName}{selectedProduct.productType === 'finished' ? ` (재고: ${stock})` : ''}
                          </option>
                        )
                      })}
                    </select>
                    {selectedProduct.productType === 'finished' && selectedSpecId && (
                      <p className="text-xs text-muted-foreground">
                        잔여 재고: {storeInventoryMap.get(selectedSpecId) ?? 0}개
                      </p>
                    )}
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
                      className="w-8 h-8 border rounded-[4px] text-sm disabled:opacity-40"
                      onClick={() => setQuantity(q => Math.min(q + 1, currentStock))}
                      disabled={quantity >= currentStock}
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>배송 판매소:</span>
              <span className="font-semibold text-foreground">{selectedStore?.name}</span>
            </div>
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
            {/* 배송 방식 선택 */}
            <div className="space-y-1.5">
              <Label>배송 방식 <span className="text-red-500">*</span></Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="parcel"
                    checked={deliveryMethod === 'parcel'}
                    onChange={() => { setDeliveryMethod('parcel'); setSelectedZoneId('') }}
                    className="accent-[#1a3a5c]"
                  />
                  <span className="text-sm">택배 배송</span>
                </label>
                <label className={`flex items-center gap-2 ${storeDeliveryZones.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="direct"
                    checked={deliveryMethod === 'direct'}
                    onChange={() => setDeliveryMethod('direct')}
                    disabled={storeDeliveryZones.length === 0}
                    className="accent-[#1a3a5c]"
                  />
                  <span className="text-sm">직접 배송</span>
                </label>
              </div>
              {storeDeliveryZones.length === 0 && (
                <p className="text-xs text-muted-foreground">해당 판매소에 등록된 직접배송 배송지가 없습니다.</p>
              )}
            </div>

            {/* 택배 배송: 주소 입력 */}
            {deliveryMethod === 'parcel' && (
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
            )}

            {/* 직접 배송: 배송지 선택 */}
            {deliveryMethod === 'direct' && (
              <div className="space-y-1.5">
                <Label>배송지 선택 <span className="text-red-500">*</span></Label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="w-full border border-input rounded-[4px] px-3 py-2 text-sm bg-background"
                >
                  <option value="">-- 배송지 선택 --</option>
                  {storeDeliveryZones.map(z => (
                    <option key={z.id} value={z.id}>
                      {z.name}{z.address ? ` (${z.address})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
