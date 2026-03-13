import { expect, test } from '@playwright/test'
import { fulfillJson, mockAdminRoute } from './helpers/admin-api-mocks'

test('@a11y landing page exposes expected landmarks and keyboard focus', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { name: /open admin/i })
      .first()
  ).toBeVisible()

  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: /skip to content/i })
  ).toBeFocused()
})

test('@a11y admin users page exposes heading and table semantics', async ({
  page,
}) => {
  await mockAdminRoute(page, /\/api\/admin\/users/, async (route) => {
    const request = route.request()
    if (
      request.method() === 'GET' &&
      request.url().endsWith('/api/admin/users')
    ) {
      await fulfillJson(route, {
        users: [
          {
            id: 'u-1',
            email: 'admin@example.com',
            full_name: 'Admin User',
            role: 'admin',
            is_active: true,
            account_state: 'active',
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-01T00:00:00.000Z',
            invited_at: null,
            deactivated_at: null,
          },
        ],
      })
      return
    }

    await fulfillJson(route, { ok: true })
  })

  await page.goto('/admin/users')
  await expect(page.getByText(/loading users/i)).not.toBeVisible({
    timeout: 15000,
  })
  await expect(
    page.getByRole('heading', { name: /user management/i })
  ).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: /user/i })).toBeVisible()
})
