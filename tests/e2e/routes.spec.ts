import { test, expect } from '@playwright/test'

test('login page renders form controls', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in to admin/i })).toBeVisible()
})

test('home page includes how-it-works section', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /How Everlume Works/i })).toBeVisible()
})
