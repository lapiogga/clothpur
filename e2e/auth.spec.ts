import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('인증', () => {
  test('로그인 페이지 접근', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    // 로그인 실패 시 /login 유지 또는 오류 메시지
    await expect(page).toHaveURL('/login')
  })

  test('admin 로그인 → /admin/dashboard 리다이렉트', async ({ page }) => {
    await login(page, 'admin@test.com')
    await expect(page).toHaveURL('/admin/dashboard')
  })

  test('store 로그인 → /store/dashboard 리다이렉트', async ({ page }) => {
    await login(page, 'store@test.com')
    await expect(page).toHaveURL('/store/dashboard')
  })

  test('tailor 로그인 → /tailor/dashboard 리다이렉트', async ({ page }) => {
    await login(page, 'tailor@test.com')
    await expect(page).toHaveURL('/tailor/dashboard')
  })

  test('user 로그인 → /my/dashboard 리다이렉트', async ({ page }) => {
    await login(page, 'user@test.com')
    await expect(page).toHaveURL('/my/dashboard')
  })

  test('미인증 상태에서 보호 경로 접근 차단', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('역할 불일치 경로 접근 차단 (user → /admin)', async ({ page }) => {
    await login(page, 'user@test.com')
    await page.goto('/admin/dashboard')
    // user 역할은 /admin 접근 불가, /my/dashboard로 리다이렉트
    await expect(page).not.toHaveURL('/admin/dashboard')
  })
})
