import { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

type CookieArg = {
  name: string
  value: string
  options?: Record<string, unknown>
}

const mockGetUser = vi.fn()
const mockCreateServerClient = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

vi.mock('@/lib/supabase/env', () => ({
  getSupabaseUrlOrThrow: () => 'http://127.0.0.1:54321',
  getSupabasePublishableKeyOrThrow: () => 'publishable-key',
}))

describe('updateSession middleware', () => {
  beforeEach(() => {
    delete process.env.E2E_BYPASS_ADMIN_AUTH
    delete process.env.E2E_FAKE_AUTH
    mockGetUser.mockReset()
    mockCreateServerClient.mockReset()
    mockCreateServerClient.mockImplementation(
      (
        _url: string,
        _key: string,
        options: { cookies: { setAll: (cookies: CookieArg[]) => void } }
      ) => {
        options.cookies.setAll([
          { name: 'sb-session', value: 'abc', options: { path: '/' } },
        ])
        return {
          auth: {
            getUser: mockGetUser,
          },
        }
      }
    )
  })

  it('bypasses auth in e2e mode for admin routes', async () => {
    process.env.E2E_BYPASS_ADMIN_AUTH = '1'

    const request = new NextRequest('http://localhost/admin')
    const response = await updateSession(request)

    expect(response.status).toBe(200)
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  it('redirects unauthenticated admin requests to login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const request = new NextRequest('http://localhost/admin/users')
    const response = await updateSession(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
  })

  it('allows authenticated admin requests', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const request = new NextRequest('http://localhost/admin/users')
    const response = await updateSession(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('preserves cookies set by Supabase client', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const request = new NextRequest('http://localhost/memorials/test')
    const response = await updateSession(request)

    expect(response.cookies.get('sb-session')?.value).toBe('abc')
  })

  it('allows admin requests through fake e2e auth sessions without creating a supabase client', async () => {
    process.env.E2E_FAKE_AUTH = '1'

    const request = new NextRequest('http://localhost/admin/users', {
      headers: {
        cookie:
          'everlume_e2e_auth=' +
          encodeURIComponent(
            JSON.stringify({
              userId: 'fake-user',
              email: 'fake@example.com',
              role: 'admin',
              isActive: true,
              fullName: 'Fake Admin',
              state: 'active',
            })
          ),
      },
    })
    const response = await updateSession(request)

    expect(response.status).toBe(200)
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  it('redirects admin requests with inactive fake e2e sessions to login', async () => {
    process.env.E2E_FAKE_AUTH = '1'

    const request = new NextRequest('http://localhost/admin/users', {
      headers: {
        cookie:
          'everlume_e2e_auth=' +
          encodeURIComponent(
            JSON.stringify({
              userId: 'fake-user',
              email: 'fake@example.com',
              role: 'admin',
              isActive: false,
              fullName: 'Fake Admin',
              state: 'deactivated',
            })
          ),
      },
    })
    const response = await updateSession(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  it('passes request cookies through getAll when creating the supabase client', async () => {
    const getAllSpy = vi.fn()
    mockCreateServerClient.mockImplementationOnce(
      (
        _url: string,
        _key: string,
        options: {
          cookies: {
            getAll: () => CookieArg[]
            setAll: (cookies: CookieArg[]) => void
          }
        }
      ) => {
        getAllSpy(options.cookies.getAll())
        return {
          auth: {
            getUser: mockGetUser,
          },
        }
      }
    )
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const request = new NextRequest('http://localhost/memorials/test', {
      headers: {
        cookie: 'hello=world; theme=serene',
      },
    })
    const response = await updateSession(request)

    expect(response.status).toBe(200)
    expect(getAllSpy).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'hello', value: 'world' }),
      expect.objectContaining({ name: 'theme', value: 'serene' }),
    ])
  })
})
