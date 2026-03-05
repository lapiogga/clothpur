import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('체척업체 담당자 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'tailor@test.com')
  })

  test('체척업체 대시보드 렌더링', async ({ page }) => {
    await expect(page).toHaveURL('/tailor/dashboard')
    await expect(page.locator('body')).toBeVisible()
  })

  test('체척권 관리 페이지 접근', async ({ page }) => {
    await page.goto('/tailor/tickets')
    await expect(page).toHaveURL('/tailor/tickets')
    await expect(page.locator('body')).toContainText(/체척권|발행/)
  })
})
