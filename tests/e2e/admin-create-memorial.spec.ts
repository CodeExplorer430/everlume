import { expect, test } from '@playwright/test'
import { fulfillJson, mockAdminRoute } from './helpers/admin-api-mocks'

test('admin can create memorial from form flow', async ({ page }) => {
  let capturedBody: Record<string, unknown> | null = null

  await mockAdminRoute(page, /\/api\/admin\/memorials$/, async (route) => {
    const req = route.request()

    if (req.method() === 'POST') {
      capturedBody = req.postDataJSON() as Record<string, unknown>
      await fulfillJson(
        route,
        {
          page: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: capturedBody?.title,
            slug: capturedBody?.slug,
          },
        },
        201
      )
      return
    }

    await fulfillJson(route, { pages: [] })
  })

  await page.goto('/admin/memorials/new')

  await page.getByPlaceholder('In Loving Memory of Jane Doe').fill('In Loving Memory of Jane Doe')
  await page.getByPlaceholder('Jane Elizabeth Doe').fill('Jane Doe')
  await page.locator('input[type="date"]').first().fill('1960-01-02')
  await page.locator('input[type="date"]').nth(1).fill('2020-02-03')

  await page.getByRole('button', { name: /create memorial/i }).click()

  await expect.poll(() => capturedBody).not.toBeNull()
  const capturedSlug = (capturedBody as { slug?: string } | null)?.slug
  expect(capturedSlug).toBe('in-loving-memory-of-jane-doe')
})
