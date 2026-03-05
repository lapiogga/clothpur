import type { DefaultSession } from 'next-auth'
import type { UserRole } from './index'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
      name: string
      email: string
      rank?: string
      unit?: string
      storeId?: string
      tailorId?: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: UserRole
    name: string
    email: string
    rank?: string
    unit?: string
    storeId?: string
    tailorId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    rank?: string
    unit?: string
    storeId?: string
    tailorId?: string
  }
}
