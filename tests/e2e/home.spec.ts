import { test, expect } from '@playwright/test'

test('home page renders primary CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /preserve their story/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /open admin/i })).toBeVisible()
})

test('navigates to login page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /admin login/i }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: /^sign in$/i })).toBeVisible()
})
