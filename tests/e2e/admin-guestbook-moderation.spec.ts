import { expect, test } from '@playwright/test'
import { fulfillJson, mockAdminRoute } from './helpers/admin-api-mocks'

test('admin can approve, unapprove, and delete guestbook entries', async ({ page }) => {
  const entries = [
    {
      id: 'g-1',
      name: 'Maria',
      message: 'Forever remembered.',
      is_approved: false,
      created_at: '2026-03-01T00:00:00.000Z',
      pages: { title: 'Loving Memory' },
    },
  ]

  await mockAdminRoute(page, /\/api\/admin\/guestbook/, async (route) => {
    const req = route.request()
    const url = req.url()

    if (req.method() === 'GET' && url.endsWith('/api/admin/guestbook')) {
      await fulfillJson(route, { entries })
      return
    }

    if (req.method() === 'POST' && url.includes('/approve')) {
      entries[0].is_approved = true
      await fulfillJson(route, { ok: true })
      return
    }

    if (req.method() === 'POST' && url.includes('/unapprove')) {
      entries[0].is_approved = false
      await fulfillJson(route, { ok: true })
      return
    }

    if (req.method() === 'DELETE') {
      entries.splice(0, 1)
      await fulfillJson(route, { ok: true })
      return
    }

    await fulfillJson(route, { ok: true })
  })

  await page.goto('/admin/guestbook')

  await expect(page.getByText('Maria')).toBeVisible()
  await page.getByRole('button', { name: /approve guestbook entry from maria/i }).click()
  await expect(page.getByRole('table').getByText('Approved', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /unapprove guestbook entry from maria/i }).click()
  await expect(page.getByRole('table').getByText('Pending', { exact: true })).toBeVisible()

  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /delete guestbook entry from maria/i }).click()
  await expect(page.getByText('No guestbook entries found yet.')).toBeVisible()
})
