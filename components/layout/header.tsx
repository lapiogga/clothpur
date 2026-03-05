"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { logoutAction } from '@/actions/auth'
import type { UserRole } from '@/types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '군수담당자',
  store: '판매소',
  tailor: '체척업체',
  user: '일반사용자',
}

interface HeaderProps {
  userName: string
  userRole: UserRole
}

export function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    await logoutAction()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 h-14 flex items-center justify-between px-6 bg-[#FAF7F2] border-b border-gray-200">
      <h1 className="text-base font-semibold text-[#1a3a5c]">
        피복 구매관리 시스템
      </h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-700">{userName}</span>
        <span className="px-2 py-0.5 text-xs rounded-[2px] bg-zinc-200 text-zinc-700">
          {ROLE_LABELS[userRole]}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-[4px] text-xs"
          onClick={handleLogout}
        >
          로그아웃
        </Button>
      </div>
    </header>
  )
}
