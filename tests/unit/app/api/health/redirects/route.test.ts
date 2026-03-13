import { GET } from '@/app/api/health/redirects/route'

const mockLimit = vi.fn()
const mockSelect = vi.fn(() => ({ limit: mockLimit }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}))

describe('GET /api/health/redirects', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    mockLimit.mockReset()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.NEXT_PUBLIC_SHORT_DOMAIN
  })

  it('returns ok when redirect table is reachable', async () => {
    mockLimit.mockResolvedValue({ error: null })
    const res = await GET()
    const payload = (await res.json()) as {
      ok: boolean
      workerReachable: boolean
    }

    expect(res.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.workerReachable).toBe(false)
  })

  it('returns worker reachability when short domain is configured', async () => {
    process.env.NEXT_PUBLIC_SHORT_DOMAIN = 'https://fam.example'
    mockLimit.mockResolvedValue({ error: null })
    fetchMock.mockResolvedValue({ status: 404 })

    const res = await GET()
    const payload = (await res.json()) as {
      ok: boolean
      workerReachable: boolean
    }

    expect(res.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.workerReachable).toBe(true)
  })

  it('returns 503 when the redirects table is unavailable', async () => {
    process.env.NEXT_PUBLIC_SHORT_DOMAIN = 'https://fam.example'
    mockLimit.mockResolvedValue({ error: { message: 'db down' } })
    fetchMock.mockRejectedValue(new Error('network down'))

    const res = await GET()
    const payload = (await res.json()) as {
      ok: boolean
      workerReachable: boolean
    }

    expect(res.status).toBe(503)
    expect(payload.ok).toBe(false)
    expect(payload.workerReachable).toBe(false)
  })
})
