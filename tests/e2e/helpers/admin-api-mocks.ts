import type { Page, Route } from '@playwright/test'

type Json = Record<string, unknown>

function isApiRequest(route: Route) {
  return route.request().url().includes('/api/admin/')
}

export async function mockAdminApiFallback(page: Page, fallbackBody: Json = { ok: true }) {
  await page.route('**/api/admin/**', async (route) => {
    if (!isApiRequest(route)) return route.fallback()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fallbackBody) })
  })
}

export async function mockAdminRoute(page: Page, matcher: RegExp, handler: (route: Route) => Promise<void> | void) {
  await page.route('**/api/admin/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathWithQuery = `${url.pathname}${url.search}`

    if (matcher.test(pathWithQuery)) {
      await handler(route)
      return
    }

    await route.fallback()
  })
}

export async function fulfillJson(route: Route, body: Json, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}
