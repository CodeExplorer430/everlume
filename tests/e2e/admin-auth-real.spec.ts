import { expect, test } from '@playwright/test'

test.describe('real admin auth flow', () => {
  test.skip(process.env.E2E_FAKE_AUTH !== '1', 'Runs only in the fake-auth Playwright lane.')

  test('redirects unauthenticated admin users to login', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: /welcome back to everlume admin/i })).toBeVisible()
  })

  test('rejects deactivated accounts during sign in', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('inactive-admin@everlume.local')
    await page.getByLabel('Password').fill('Everlume123!')
    await page.getByRole('button', { name: /sign in to admin/i }).click()

    await expect(page.getByText('This account has been deactivated.')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('completes password setup and signs in with the new password', async ({ page }) => {
    await page.goto('/login/forgot-password')
    await page.getByLabel('Email').fill('pending-admin@everlume.local')
    await page.getByRole('button', { name: /send password reset/i }).click()

    await expect(page.getByRole('link', { name: /continue to password reset/i })).toBeVisible()
    await page.getByRole('link', { name: /continue to password reset/i }).click()

    await page.getByLabel('New Password').fill('ChangedPass1!')
    await page.getByLabel('Confirm Password').fill('ChangedPass1!')
    await page.getByRole('button', { name: /update password/i }).click()

    await expect(page.getByText(/password updated\. redirecting to sign in/i)).toBeVisible()
    await page.waitForURL(/\/login\?reset=success/)

    await page.getByLabel('Email').fill('pending-admin@everlume.local')
    await page.getByLabel('Password').fill('ChangedPass1!')
    await page.getByRole('button', { name: /sign in to admin/i }).click()

    await page.waitForURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })
})
