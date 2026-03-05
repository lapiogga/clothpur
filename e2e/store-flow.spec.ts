import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('판매소 담당자 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'store@test.com')
  })

  test('판매소 대시보드 렌더링', async ({ page }) => {
    await expect(page).toHaveURL('/store/dashboard')
    await expect(page.locator('body')).toBeVisible()
  })

  test('재고 관리 페이지 접근', async ({ page }) => {
    await page.goto('/store/inventory')
    await expect(page).toHaveURL('/store/inventory')
    await expect(page.locator('body')).toContainText(/재고/)
  })

  test('판매 페이지 접근', async ({ page }) => {
    await page.goto('/store/sales')
    await expect(page).toHaveURL('/store/sales')
    await expect(page.locator('body')).toBeVisible()
  })

  test('주문 현황 페이지 접근', async ({ page }) => {
    await page.goto('/store/orders')
    await expect(page).toHaveURL('/store/orders')
    await expect(page.locator('body')).toBeVisible()
  })

  test('재고 페이지에 재고 목록 표시', async ({ page }) => {
    await page.goto('/store/inventory')
    await expect(page.locator('body')).toContainText(/재고|품목/)
  })
})
