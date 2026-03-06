import { test, expect } from '@playwright/test'

test('home page renders primary CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /modern memorial platform/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /open admin/i })).toBeVisible()
})

test('navigates to login page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /open admin/i }).click()
  await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
  await expect(page.getByRole('heading', { name: /^sign in$/i })).toBeVisible()
})
