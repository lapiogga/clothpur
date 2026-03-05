import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { users } from './schema'
import { authConfig } from './auth.config'
import type { UserRole } from '@/types'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const rows = db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)
          .all()
        const user = rows[0]
        if (!user) return null
        if (!user.isActive) return null

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          rank: user.rank ?? undefined,
          unit: user.unit ?? undefined,
          storeId: user.storeId ?? undefined,
          tailorId: user.tailorId ?? undefined,
        }
      },
    }),
  ],
})
