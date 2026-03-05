import type { NextAuthConfig } from 'next-auth'
import type { UserRole } from '@/types'

// Edge Runtime 호환 설정 (DB 의존성 없음)
// 미들웨어에서만 사용
export const authConfig: NextAuthConfig = {
  providers: [], // 미들웨어에서는 provider 불필요 (JWT 검증만)
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.rank = (user as { rank?: string }).rank
        token.unit = (user as { unit?: string }).unit
        token.storeId = (user as { storeId?: string }).storeId
        token.tailorId = (user as { tailorId?: string }).tailorId
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as UserRole
      session.user.rank = token.rank as string | undefined
      session.user.unit = token.unit as string | undefined
      session.user.storeId = token.storeId as string | undefined
      session.user.tailorId = token.tailorId as string | undefined
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}
