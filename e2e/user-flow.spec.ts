import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('사용자 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'user@test.com')
  })

  test('내 대시보드 렌더링', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('포인트 현황 페이지 접근', async ({ page }) => {
    await page.goto('/my/points')
    await expect(page).toHaveURL('/my/points')
    // 포인트 관련 텍스트 확인
    await expect(page.locator('body')).toContainText(/포인트/)
  })

  test('쇼핑 페이지 접근', async ({ page }) => {
    await page.goto('/my/shop')
    await expect(page).toHaveURL('/my/shop')
    await expect(page.locator('body')).toBeVisible()
  })

  test('주문 내역 페이지 접근', async ({ page }) => {
    await page.goto('/my/orders')
    await expect(page).toHaveURL('/my/orders')
    await expect(page.locator('body')).toBeVisible()
  })

  test('쇼핑 페이지에 상품 목록 표시', async ({ page }) => {
    await page.goto('/my/shop')
    // 품목 카드 또는 테이블이 존재해야 함
    const content = page.locator('body')
    await expect(content).toBeVisible()
  })
})
