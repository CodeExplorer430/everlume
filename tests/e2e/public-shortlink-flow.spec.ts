import { expect, test } from '@playwright/test'

test('active short links redirect visitors to the memorial route', async ({ page }) => {
  await page.goto('/r/tribute-demo')

  await page.waitForURL(/\/memorials\/e2e-public-memorial$/)
  await expect(page.getByRole('heading', { name: /in loving memory of amelia stone/i })).toBeVisible()
})

test('disabled short links land on the fallback experience', async ({ page }) => {
  await page.goto('/r/tribute-disabled')

  await expect(page).toHaveURL(/\/r\/not-found\?code=tribute-disabled&reason=disabled/)
  await expect(page.getByRole('heading', { name: /we couldn't open this short link/i })).toBeVisible()
  await expect(page.getByText(/disabled by an admin/i)).toBeVisible()
})

test('missing short links land on the missing fallback state', async ({ page }) => {
  await page.goto('/r/tribute-missing')

  await expect(page).toHaveURL(/\/r\/not-found\?code=tribute-missing&reason=missing/)
  await expect(page.getByRole('heading', { name: /we couldn't open this short link/i })).toBeVisible()
  await expect(page.getByText(/does not exist/i)).toBeVisible()
})
