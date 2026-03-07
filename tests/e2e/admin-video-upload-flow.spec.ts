import { expect, test, type Page } from '@playwright/test'
import { fulfillJson, mockAdminRoute } from './helpers/admin-api-mocks'

const PAGE_ID = '550e8400-e29b-41d4-a716-446655440000'
const PAGE_PATH = `/admin/memorials/${PAGE_ID}`

type UploadScenario = {
  initStatus?: number
  initMessage?: string
  uploadStatus?: number
  startStatus?: number
  startMessage?: string
  pollStatuses?: Array<'processing' | 'completed' | 'fallback_required' | 'failed' | 'attached'>
  pollErrorMessage?: string
  attachStatus?: number
  attachMessage?: string
}

async function setupVideoUploadMocks(page: Page, scenario: UploadScenario = {}) {
  const videos: Array<{ id: string; provider: 'youtube' | 'cloudinary'; provider_id: string; title: string }> = []
  const pollStatuses = scenario.pollStatuses ? [...scenario.pollStatuses] : ['completed']

  await page.route('**/mock-upload/**', async (route) => {
    const status = scenario.uploadStatus ?? 200
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(status >= 400 ? { message: 'Upload failed.' } : { ok: true }),
    })
  })

  await mockAdminRoute(page, /\/api\/admin\//, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname

    if (req.method() === 'GET' && path === `/api/admin/pages/${PAGE_ID}`) {
      await fulfillJson(route, {
        page: {
          id: PAGE_ID,
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

    if (req.method() === 'GET' && path === `/api/admin/pages/${PAGE_ID}/redirects`) {
      await fulfillJson(route, { redirects: [{ id: 'r-1', shortcode: 'jane', print_status: 'verified', is_active: true }] })
      return
    }

    if (req.method() === 'GET' && path === `/api/admin/pages/${PAGE_ID}/photos`) {
      await fulfillJson(route, { photos: [] })
      return
    }

    if (req.method() === 'GET' && path === `/api/admin/pages/${PAGE_ID}/videos`) {
      await fulfillJson(route, { videos })
      return
    }

    if (req.method() === 'POST' && path === '/api/admin/videos/uploads/init') {
      const status = scenario.initStatus ?? 201
      if (status >= 400) {
        await fulfillJson(route, { message: scenario.initMessage || 'Unable to initialize video upload.' }, status)
        return
      }

      await fulfillJson(route, {
        job: {
          id: 'job-1',
          status: 'uploading',
          uploadUrl: 'http://127.0.0.1:4173/mock-upload/job-1',
          uploadMethod: 'PUT',
        },
      }, 201)
      return
    }

    if (req.method() === 'POST' && path === '/api/admin/videos/uploads/job-1/start') {
      const status = scenario.startStatus ?? 202
      if (status >= 400) {
        await fulfillJson(route, { message: scenario.startMessage || 'Unable to start transcode job.' }, status)
        return
      }

      await fulfillJson(route, { ok: true }, 202)
      return
    }

    if (req.method() === 'GET' && path === '/api/admin/videos/uploads/job-1') {
      const status = pollStatuses.length > 0 ? pollStatuses.shift()! : 'completed'
      await fulfillJson(route, {
        job: {
          id: 'job-1',
          status,
          error_message: status === 'failed' ? scenario.pollErrorMessage || 'Transcode failed.' : null,
        },
      })
      return
    }

    if (req.method() === 'POST' && path === '/api/admin/videos/uploads/job-1/attach') {
      const status = scenario.attachStatus ?? 201
      if (status >= 400) {
        await fulfillJson(route, { message: scenario.attachMessage || 'Unable to attach processed video.' }, status)
        return
      }

      const created = {
        id: 'video-1',
        provider: 'cloudinary' as const,
        provider_id: 'everlume/page/video-1',
        title: 'Uploaded File Title',
      }
      videos.push(created)
      await fulfillJson(route, { video: created }, 201)
      return
    }

    await fulfillJson(route, { ok: true })
  })
}

async function uploadSampleVideo(page: Page) {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'tribute.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('video-bytes'),
  })
  await page.getByPlaceholder('Uploaded File Title (Optional)').fill('Uploaded File Title')
  await page.getByRole('button', { name: 'Upload and process video' }).click()
}

test('admin upload flow succeeds and attaches cloudinary video', async ({ page }) => {
  await setupVideoUploadMocks(page, {
    pollStatuses: ['processing', 'completed'],
  })

  await page.goto(PAGE_PATH, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /video links/i })).toBeVisible()

  await uploadSampleVideo(page)

  await expect(page.getByText('Cloudinary ID: everlume/page/video-1')).toBeVisible()
  await expect(page.getByText(/Unable to/)).not.toBeVisible()
})

test('shows transcode fallback guidance when job status requires fallback', async ({ page }) => {
  await setupVideoUploadMocks(page, {
    pollStatuses: ['fallback_required'],
  })

  await page.goto(PAGE_PATH, { waitUntil: 'domcontentloaded' })
  await uploadSampleVideo(page)

  await expect(page.getByText(/Video still exceeds the 100MB Cloudinary limit/i)).toBeVisible()
})

test('shows init failure message when upload init fails', async ({ page }) => {
  await setupVideoUploadMocks(page, {
    initStatus: 503,
    initMessage: 'Transcode service is unreachable.',
  })

  await page.goto(PAGE_PATH, { waitUntil: 'domcontentloaded' })
  await uploadSampleVideo(page)

  await expect(page.getByText('Transcode service is unreachable.')).toBeVisible()
})

test('shows start failure message when processing cannot start', async ({ page }) => {
  await setupVideoUploadMocks(page, {
    startStatus: 502,
    startMessage: 'Unable to start transcode job.',
  })

  await page.goto(PAGE_PATH, { waitUntil: 'domcontentloaded' })
  await uploadSampleVideo(page)

  await expect(page.getByText('Unable to start transcode job.')).toBeVisible()
})

test('shows attach failure message when completed job cannot be attached', async ({ page }) => {
  await setupVideoUploadMocks(page, {
    pollStatuses: ['completed'],
    attachStatus: 500,
    attachMessage: 'Unable to attach processed video.',
  })

  await page.goto(PAGE_PATH, { waitUntil: 'domcontentloaded' })
  await uploadSampleVideo(page)

  await expect(page.getByText('Unable to attach processed video.')).toBeVisible()
})
