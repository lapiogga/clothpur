import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/types'

// 역할별 허용 경로 prefix
const ROLE_PATH_MAP: Record<UserRole, string> = {
  admin: '/admin',
  store: '/store',
  tailor: '/tailor',
  user: '/my',
}

// 역할별 기본 대시보드 경로
const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  store: '/store/dashboard',
  tailor: '/tailor/dashboard',
  user: '/my/dashboard',
}

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const pathname = nextUrl.pathname

  // 인증 페이지는 통과
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    // 이미 로그인한 경우 대시보드로 리다이렉트
    if (session?.user?.role) {
      const dashboard = ROLE_DASHBOARD_MAP[session.user.role as UserRole]
      return NextResponse.redirect(new URL(dashboard, req.url))
    }
    return NextResponse.next()
  }

  // 비인증 사용자는 로그인 페이지로
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = session.user.role as UserRole
  const allowedPrefix = ROLE_PATH_MAP[role]

  // 역할에 맞지 않는 경로 접근 시 본인 대시보드로
  if (!pathname.startsWith(allowedPrefix)) {
    const dashboard = ROLE_DASHBOARD_MAP[role]
    return NextResponse.redirect(new URL(dashboard, req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
