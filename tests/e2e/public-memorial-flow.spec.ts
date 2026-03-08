import { expect, test } from '@playwright/test'
import { fulfillJson, mockPublicRoute } from './helpers/public-api-mocks'

test.describe.configure({ timeout: 60_000 })

test('public memorial renders visitor-facing content', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => undefined,
      },
    })
    Object.defineProperty(window, 'print', {
      configurable: true,
      value: () => {
        document.documentElement.dataset.printTriggered = 'true'
      },
    })
  })

  await page.goto('/memorials/e2e-public-memorial')

  await expect(page.getByRole('heading', { name: /in loving memory of amelia stone/i })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /our memories/i })).toBeVisible()
  await expect(page.getByText(/Amelia taught our family to sing, to serve, and to carry gentleness into every room\./i)).toBeVisible()
  await expect(page.getByRole('heading', { name: /video memories/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /life timeline/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /guestbook/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /^share$/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /copy link/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /print memorial/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /leave a message/i })).toHaveAttribute('href', '#guestbook')
  await expect(page.getByText(/Amelia taught three generations of our family/i)).toBeVisible()
  await expect(page.getByText(/Family tribute recording/i)).toBeVisible()
  await expect(page.getByText(/organized the first annual remembrance concert/i)).toBeVisible()

  await page.getByRole('button', { name: /open photo 1/i }).click()
  await expect(page.getByRole('dialog', { name: /photo lightbox/i })).toBeVisible()
  await page.getByRole('button', { name: /close photo lightbox/i }).click()
  await expect(page.getByRole('dialog', { name: /photo lightbox/i })).not.toBeVisible()

  await page.getByRole('button', { name: /copy link/i }).click()
  await expect(page.getByText(/Memorial link copied/i)).toBeVisible()

  await page.getByRole('button', { name: /print memorial/i }).click()
  await expect(page.locator('html')).toHaveAttribute('data-print-triggered', 'true')
})

test('password memorial unlocks and guestbook submission succeeds', async ({ page }) => {
  await mockPublicRoute(page, /^\/api\/guestbook$/, async (route) => {
    await fulfillJson(route, { ok: true }, 201)
  })

  await page.goto('/memorials/e2e-password-memorial')

  await expect(page.getByRole('heading', { name: /memorial access required/i })).toBeVisible({ timeout: 15_000 })
  await page.getByLabel('Access Password').fill('EverlumeMemory!')
  await page.getByRole('button', { name: /unlock memorial/i }).click()

  await expect(page.getByRole('heading', { name: /in loving memory of mateo rivera/i })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/This memorial is shared quietly with those who knew Mateo best\./i)).toBeVisible()
  await expect(page.getByText(/Thank you for protecting this space for the family/i)).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  await page.getByLabel('Your Name').fill('Lucia Rivera')
  await page.getByLabel('Your Message').fill('We miss the way Mateo welcomed everyone into the workshop.')
  const guestbookResponse = page.waitForResponse((response) => response.url().includes('/api/guestbook') && response.request().method() === 'POST')
  await page.getByRole('button', { name: /post to guestbook/i }).click()
  await guestbookResponse

  await expect(page.getByRole('heading', { name: /thank you for sharing/i })).toBeVisible()
  await expect(page.getByText(/will appear after moderation/i)).toBeVisible()
})

test('guestbook submission failures surface inline feedback', async ({ page }) => {
  await mockPublicRoute(page, /^\/api\/guestbook$/, async (route) => {
    await fulfillJson(route, { code: 'DATABASE_ERROR', message: 'Unable to submit your message right now.' }, 500)
  })

  await page.goto('/memorials/e2e-public-memorial')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  await page.getByLabel('Your Name').fill('Daniel Cruz')
  await page.getByLabel('Your Message').fill('Thank you for every lesson and every quiet act of care.')
  const guestbookResponse = page.waitForResponse((response) => response.url().includes('/api/guestbook') && response.request().method() === 'POST')
  await page.getByRole('button', { name: /post to guestbook/i }).click()
  await guestbookResponse

  await expect(page.getByText('The guestbook is temporarily unavailable. Please try again shortly.')).toBeVisible()
})

test('private memorials stay undiscoverable to public visitors', async ({ page }) => {
  await page.goto('/memorials/e2e-private-memorial')

  await expect(page.getByRole('heading', { name: /^memorial not found$/i })).toBeVisible()
  await expect(page.getByText(/private, password protected, unpublished/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: /in loving memory of clara reyes/i })).not.toBeVisible()
  await expect(page.getByRole('heading', { name: /memorial access required/i })).not.toBeVisible()
})
