import { expect, test } from '@playwright/test'

test('@a11y landing page exposes expected landmarks and keyboard focus', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('link', { name: /open admin/i })).toBeVisible()

  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: /skip to content/i })).toBeFocused()
})

test('@a11y admin users page exposes heading and table semantics', async ({ page }) => {
  await page.route('**/api/admin/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: [
          {
            id: 'u-1',
            full_name: 'Admin User',
            role: 'admin',
            is_active: true,
            created_at: '2026-03-01T00:00:00.000Z',
          },
        ],
      }),
    })
  })

  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: /user/i })).toBeVisible()
})
