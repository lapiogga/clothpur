"use server"

import { signIn, signOut } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

export async function loginAction(formData: { email: string; password: string }) {
  try {
    await signIn('credentials', {
      email: formData.email,
      password: formData.password,
      redirect: false,
    })
    return { success: true }
  } catch (error) {
    // NextAuth v5가 내부적으로 NEXT_REDIRECT를 throw하는 경우 re-throw
    if (isRedirectError(error)) throw error
    if (error instanceof AuthError) {
      return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
    }
    throw error
  }
}

export async function logoutAction() {
  await signOut({ redirect: false })
  return { success: true }
}
