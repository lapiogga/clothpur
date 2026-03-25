"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: '대시보드', href: '/store/dashboard' },
  { label: '오프라인 판매', href: '/store/sales' },
  { label: '재고 관리', href: '/store/inventory' },
  { label: '주문 현황', href: '/store/orders' },
  { label: '배송지 관리', href: '/store/delivery-zones' },
]

export function StoreSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="shrink-0 h-[calc(100vh-56px)] sticky top-14 overflow-y-auto border-r border-gray-200"
      style={{ width: 200, backgroundColor: '#FAF7F2' }}
    >
      <nav className="py-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/store/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-4 py-2 text-sm transition-colors"
              style={{
                backgroundColor: isActive ? '#1a3a5c' : 'transparent',
                color: isActive ? '#ffffff' : '#374151',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
