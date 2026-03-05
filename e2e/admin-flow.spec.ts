import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('군수담당자 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@test.com')
  })

  test('관리자 대시보드 렌더링', async ({ page }) => {
    await expect(page).toHaveURL('/admin/dashboard')
    await expect(page.locator('body')).toBeVisible()
  })

  test('체척업체 관리 페이지 접근', async ({ page }) => {
    await page.goto('/admin/tailors')
    await expect(page).toHaveURL('/admin/tailors')
    await expect(page.locator('body')).toContainText(/체척/)
  })

  test('포인트 현황 페이지 접근', async ({ page }) => {
    await page.goto('/admin/points')
    await expect(page).toHaveURL('/admin/points')
    await expect(page.locator('body')).toContainText(/포인트/)
  })

  test('포인트 지급 페이지 접근', async ({ page }) => {
    await page.goto('/admin/points/grant')
    await expect(page).toHaveURL('/admin/points/grant')
    await expect(page.locator('body')).toBeVisible()
  })
})
