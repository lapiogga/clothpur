import { Page } from '@playwright/test'

export async function login(page: Page, email: string, password = 'password1234') {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  // 로그인 후 대시보드로 리다이렉트 대기
  await page.waitForURL(/\/(admin|store|tailor|my)\/dashboard/, { timeout: 10000 })
}

export async function logout(page: Page) {
  // 헤더의 로그아웃 버튼 클릭
  const logoutBtn = page.locator('button', { hasText: '로그아웃' })
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await page.waitForURL('/login', { timeout: 5000 })
  }
}
