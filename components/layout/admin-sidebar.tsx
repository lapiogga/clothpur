"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
}

interface NavGroup {
  group: string
  items: NavItem[]
}

type NavConfig = (NavItem | NavGroup)[]

const NAV_CONFIG: NavConfig = [
  { label: '대시보드', href: '/admin/dashboard' },
  {
    group: '사용자 관리',
    items: [
      { label: '사용자 목록', href: '/admin/users' },
    ],
  },
  {
    group: '기초 데이터',
    items: [
      { label: '판매소 관리', href: '/admin/stores' },
      { label: '체척업체 관리', href: '/admin/tailors' },
    ],
  },
  {
    group: '품목 관리',
    items: [
      { label: '품목 분류', href: '/admin/products/categories' },
      { label: '품목/규격', href: '/admin/products' },
    ],
  },
  {
    group: '포인트 관리',
    items: [
      { label: '포인트 지급', href: '/admin/points/grant' },
      { label: '포인트 현황', href: '/admin/points' },
    ],
  },
]

function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return 'group' in item
}

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="shrink-0 h-[calc(100vh-56px)] sticky top-14 overflow-y-auto border-r border-gray-200"
      style={{ width: 220, backgroundColor: '#FAF7F2' }}
    >
      <nav className="py-3">
        {NAV_CONFIG.map((item, idx) => {
          if (!isNavGroup(item)) {
            const isActive = pathname === item.href
            return (
              <Link
                key={idx}
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
          }

          return (
            <div key={idx} className="mt-3">
              <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {item.group}
              </p>
              {item.items.map((sub, subIdx) => {
                const isActive = pathname === sub.href
                return (
                  <Link
                    key={subIdx}
                    href={sub.href}
                    className="flex items-center px-4 py-2 text-sm transition-colors"
                    style={{
                      backgroundColor: isActive ? '#1a3a5c' : 'transparent',
                      color: isActive ? '#ffffff' : '#374151',
                    }}
                  >
                    {sub.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
