import { POST } from '@/app/api/public/memorials/[slug]/unlock/route'
import { hashMemorialPassword } from '@/lib/server/page-password'

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}))

describe('POST /api/public/memorials/[slug]/unlock', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockSingle.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejects an invalid memorial slug before reading the request body', async () => {
    const req = new Request(
      'http://localhost/api/public/memorials/%20/unlock',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'correct-password' }),
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ slug: ' ' }),
    })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Invalid memorial slug.',
    })
    expect(mockSingle).not.toHaveBeenCalled()
  })

  it('rejects invalid json request payloads', async () => {
    const req = new Request(
      'http://localhost/api/public/memorials/jane/unlock',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{bad',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ slug: 'jane' }),
    })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: 'INVALID_JSON',
      message: 'Invalid request payload.',
    })
  })

  it('rejects empty passwords', async () => {
    const req = new Request(
      'http://localhost/api/public/memorials/jane/unlock',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: '' }),
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ slug: 'jane' }),
    })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Enter your access password.',
    })
  })

  it('returns 401 for invalid password', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'page-1',
        slug: 'jane',
        access_mode: 'password',
        password_hash: hashMemorialPassword('correct-password'),
        password_updated_at: '2026-03-06T00:00:00.000Z',
      },
    })

    const req = new Request(
      'http://localhost/api/public/memorials/jane/unlock',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'wrong' }),
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ slug: 'jane' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 and sets cookie for valid password', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'page-1',
        slug: 'jane',
        access_mode: 'password',
        password_hash: hashMemorialPassword('correct-password'),
        password_updated_at: '2026-03-06T00:00:00.000Z',
      },
    })

    const req = new Request(
      'http://localhost/api/public/memorials/jane/unlock',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'correct-password' }),
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ slug: 'jane' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain(
      'everlume_memorial_access_page-1='
    )
    expect(res.headers.get('set-cookie')).toContain('Path=/')
  })

  it('uses null password timestamps when unlocking fixture memorials without a password update date', async () => {
    const fixtureSpy = vi.spyOn(
      await import('@/lib/server/e2e-public-fixtures'),
      'verifyE2EMemorialPassword'
    )
    fixtureSpy.mockReturnValue({
      ok: true,
      memorial: {
        id: 'fixture-page',
        slug: 'fixture-memorial',
        access_mode: 'password',
        password_updated_at: null,
      },
    } as never)

    const req = new Request(
      'http://localhost/api/public/memorials/fixture-memorial/unlock',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'correct-password' }),
      }
    )

    const createTokenSpy = vi.spyOn(
      await import('@/lib/server/page-password'),
      'createMemorialAccessToken'
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ slug: 'fixture-memorial' }),
    })

    expect(res.status).toBe(200)
    expect(createTokenSpy).toHaveBeenCalledWith('fixture-page', null)
  })

  it('uses null password timestamps when unlocking database memorials without a password update date', async () => {
    const createTokenSpy = vi.spyOn(
      await import('@/lib/server/page-password'),
      'createMemorialAccessToken'
    )
    mockSingle.mockResolvedValue({
      data: {
        id: 'page-2',
        slug: 'jane',
        access_mode: 'password',
        password_hash: hashMemorialPassword('correct-password'),
        password_updated_at: null,
      },
    })

    const req = new Request(
      'http://localhost/api/public/memorials/jane/unlock',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'correct-password' }),
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ slug: 'jane' }),
    })

    expect(res.status).toBe(200)
    expect(createTokenSpy).toHaveBeenCalledWith('page-2', null)
  })

  it('unlocks password memorial fixtures when the e2e public lane is enabled', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')

    const req = new Request(
      'http://localhost/api/public/memorials/e2e-password-memorial/unlock',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'EverlumeMemory!' }),
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ slug: 'e2e-password-memorial' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain(
      'everlume_memorial_access_12222222-2222-2222-2222-222222222222='
    )
    expect(res.headers.get('set-cookie')).toContain('Path=/')
  })

  it('rejects invalid passwords for password memorial fixtures', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')

    const req = new Request(
      'http://localhost/api/public/memorials/e2e-password-memorial/unlock',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'incorrect-password' }),
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ slug: 'e2e-password-memorial' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns not found for missing or non-password memorials', async () => {
    mockSingle.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({
      data: {
        id: 'page-1',
        slug: 'jane',
        access_mode: 'public',
        password_hash: null,
        password_updated_at: null,
      },
    })

    const missingReq = new Request(
      'http://localhost/api/public/memorials/jane/unlock',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'correct-password' }),
      }
    )

    const missingRes = await POST(missingReq as never, {
      params: Promise.resolve({ slug: 'jane' }),
    })
    expect(missingRes.status).toBe(404)

    const publicReq = new Request(
      'http://localhost/api/public/memorials/jane/unlock',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'correct-password' }),
      }
    )

    const publicRes = await POST(publicReq as never, {
      params: Promise.resolve({ slug: 'jane' }),
    })
    expect(publicRes.status).toBe(404)
    await expect(publicRes.json()).resolves.toMatchObject({
      code: 'NOT_FOUND',
      message: 'This memorial is not available for password unlock.',
    })
  })
})
