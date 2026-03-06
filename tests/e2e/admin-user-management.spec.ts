import { expect, test } from '@playwright/test'
import { fulfillJson, mockAdminRoute } from './helpers/admin-api-mocks'

test('admin invites and updates users', async ({ page }) => {
  const users = [
    {
      id: 'u-1',
      full_name: 'Miguel Velasco',
      role: 'admin',
      is_active: true,
      created_at: '2026-03-01T00:00:00.000Z',
    },
  ]

  await mockAdminRoute(page, /\/api\/admin\/users/, async (route) => {
    const req = route.request()
    const url = req.url()

    if (req.method() === 'GET' && url.endsWith('/api/admin/users')) {
      await fulfillJson(route, { users })
      return
    }

    if (req.method() === 'POST' && url.endsWith('/api/admin/users')) {
      const body = req.postDataJSON() as { fullName: string; role: 'admin' | 'editor' | 'viewer' }
      const created = {
        id: 'u-2',
        full_name: body.fullName,
        role: body.role,
        is_active: true,
        created_at: '2026-03-03T00:00:00.000Z',
      }
      users.unshift(created)
      await fulfillJson(route, { user: created }, 201)
      return
    }

    if (req.method() === 'PATCH' && /\/api\/admin\/users\/.+/.test(url)) {
      const id = url.split('/').pop() as string
      const body = req.postDataJSON() as { role?: 'admin' | 'editor' | 'viewer'; isActive?: boolean }
      const user = users.find((u) => u.id === id)
      if (user) {
        if (body.role) user.role = body.role
        if (typeof body.isActive === 'boolean') user.is_active = body.isActive
      }
      await fulfillJson(route, { user })
      return
    }

    if (req.method() === 'DELETE' && /\/api\/admin\/users\/.+/.test(url)) {
      const id = url.split('/').pop() as string
      const user = users.find((u) => u.id === id)
      if (user) user.is_active = false
      await fulfillJson(route, { ok: true })
      return
    }

    await fulfillJson(route, { ok: true })
  })

  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible()

  await page.getByPlaceholder('name@example.com').fill('editor@everlume.test')
  await page.getByPlaceholder('Alex Santos').fill('Editor Person')
  await page.getByLabel('Invite role').selectOption('editor')
  await page.getByRole('button', { name: /^invite$/i }).click()

  await expect(page.getByText('Editor Person')).toBeVisible()

  await page.getByLabel('Role for Editor Person').selectOption('viewer')
  await expect(page.getByLabel('Role for Editor Person')).toHaveValue('viewer')

  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /deactivate editor person/i }).click()
  await expect(page.getByText('Inactive')).toBeVisible()
})
