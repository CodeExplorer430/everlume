import { expect, test } from '@playwright/test'
import { fulfillJson, mockAdminRoute } from './helpers/admin-api-mocks'

test('admin manages short links and sees QR section on memorial edit', async ({ page }) => {
  const redirects = [
    {
      id: 'r-1',
      shortcode: 'grandma',
      target_url: 'https://everlume.app/memorials/grandma',
      print_status: 'unverified',
      last_verified_at: null,
      is_active: true,
      created_at: '2026-03-01T00:00:00.000Z',
    },
  ]

  await mockAdminRoute(page, /\/api\/admin\//, async (route) => {
    const req = route.request()
    const url = req.url()

    if (req.method() === 'GET' && url.endsWith('/api/admin/redirects')) {
      await fulfillJson(route, { redirects })
      return
    }

    if (req.method() === 'POST' && url.endsWith('/api/admin/redirects')) {
      const body = req.postDataJSON() as { shortcode: string; targetUrl: string }
      const created = {
        id: 'r-2',
        shortcode: body.shortcode,
        target_url: body.targetUrl,
        print_status: 'unverified',
        last_verified_at: null,
        is_active: true,
        created_at: '2026-03-02T00:00:00.000Z',
      }
      redirects.unshift(created)
      await fulfillJson(route, { redirect: created }, 201)
      return
    }

    if (req.method() === 'DELETE' && /\/api\/admin\/redirects\/.+/.test(url)) {
      await fulfillJson(route, { ok: true })
      return
    }

    if (req.method() === 'PATCH' && /\/api\/admin\/redirects\/.+/.test(url)) {
      await fulfillJson(route, {
        redirect: {
          id: 'r-1',
          shortcode: 'grandma',
          target_url: 'https://everlume.app/memorials/grandma',
          print_status: 'verified',
          last_verified_at: '2026-03-06T00:00:00.000Z',
          is_active: true,
          created_at: '2026-03-01T00:00:00.000Z',
        },
      })
      return
    }

    if (req.method() === 'GET' && /\/api\/admin\/pages\/.+\/redirects$/.test(url)) {
      await fulfillJson(route, { redirects: [{ id: 'r-1', shortcode: 'grandma', print_status: 'verified', is_active: true }] })
      return
    }

    if (req.method() === 'GET' && /\/api\/admin\/pages\/.+$/.test(url)) {
      await fulfillJson(route, {
        page: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'In Loving Memory',
          slug: 'in-loving-memory',
          full_name: 'Jane Doe',
          dob: null,
          dod: null,
          privacy: 'public',
          hero_image_url: null,
        },
      })
      return
    }

    if (req.method() === 'GET' && /\/api\/admin\/pages\/.+\/(photos|timeline|videos)$/.test(url)) {
      const key = url.match(/(photos|timeline|videos)$/)?.[1]
      if (key === 'photos') await fulfillJson(route, { photos: [] })
      if (key === 'timeline') await fulfillJson(route, { events: [] })
      if (key === 'videos') await fulfillJson(route, { videos: [] })
      return
    }

    await fulfillJson(route, { ok: true })
  })

  await page.goto('/admin/settings')
  await expect(page.getByRole('heading', { name: /short url management/i })).toBeVisible()

  await page.getByPlaceholder('grandma').fill('nanay')
  await page.getByPlaceholder('https://yourdomain.com/memorials/sample').fill('https://everlume.app/memorials/nanay')
  await page.getByRole('button', { name: /create redirect/i }).click()

  await expect(page.getByText('/r/nanay')).toBeVisible()

  await page.goto('/admin/memorials/550e8400-e29b-41d4-a716-446655440000', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /edit memorial/i })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('heading', { name: /qr code for plaque/i })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/\/r\/grandma$/)).toBeVisible()
})

test('qr selector excludes inactive short links', async ({ page }) => {
  await mockAdminRoute(page, /\/api\/admin\//, async (route) => {
    const req = route.request()
    const url = req.url()

    if (req.method() === 'GET' && /\/api\/admin\/pages\/.+$/.test(url)) {
      await fulfillJson(route, {
        page: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'In Loving Memory',
          slug: 'in-loving-memory',
          full_name: 'Jane Doe',
          dob: null,
          dod: null,
          privacy: 'public',
          hero_image_url: null,
        },
      })
      return
    }

    if (req.method() === 'GET' && /\/api\/admin\/pages\/.+\/redirects$/.test(url)) {
      await fulfillJson(route, {
        redirects: [
          { id: 'r-1', shortcode: 'grandma', print_status: 'verified', is_active: true },
          { id: 'r-2', shortcode: 'legacy-code', print_status: 'unverified', is_active: false },
          { id: 'r-3', shortcode: 'nanay', print_status: 'unverified', is_active: true },
        ],
      })
      return
    }

    if (req.method() === 'GET' && /\/api\/admin\/pages\/.+\/(photos|timeline|videos)$/.test(url)) {
      const key = url.match(/(photos|timeline|videos)$/)?.[1]
      if (key === 'photos') await fulfillJson(route, { photos: [] })
      if (key === 'timeline') await fulfillJson(route, { events: [] })
      if (key === 'videos') await fulfillJson(route, { videos: [] })
      return
    }

    await fulfillJson(route, { ok: true })
  })

  await page.goto('/admin/memorials/550e8400-e29b-41d4-a716-446655440000', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /qr code for plaque/i })).toBeVisible({ timeout: 15000 })
  await expect(page.getByLabel('Select URL for QR')).toBeVisible()

  const options = await page.locator('#qr-url-selector option').allTextContents()
  expect(options.join(' ')).toContain('/r/grandma')
  expect(options.join(' ')).toContain('/r/nanay')
  expect(options.join(' ')).not.toContain('/r/legacy-code')
})
