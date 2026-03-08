import { render, waitFor } from '@testing-library/react'
import { ServiceWorkerRegister } from '@/components/public/ServiceWorkerRegister'

describe('ServiceWorkerRegister', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    delete document.documentElement.dataset.everlumeOfflineReady
    delete document.documentElement.dataset.everlumeInstallable
    delete document.documentElement.dataset.everlumeInstalled
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    })
  })

  it('does not register service worker outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    const register = vi.fn()
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    })

    render(<ServiceWorkerRegister />)

    await waitFor(() => {
      expect(register).not.toHaveBeenCalled()
    })
  })

  it('registers service worker in production when supported', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const register = vi.fn().mockResolvedValue({})
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    })

    render(<ServiceWorkerRegister />)

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('/sw.js')
    })
    expect(document.documentElement.dataset.everlumeOfflineReady).toBe('true')
  })

  it('swallows registration errors in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const register = vi.fn().mockRejectedValue(new Error('unsupported'))
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    })

    expect(() => render(<ServiceWorkerRegister />)).not.toThrow()
    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('/sw.js')
    })
  })

  it('marks installability and installation state from browser events', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const register = vi.fn().mockResolvedValue({})
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    })

    render(<ServiceWorkerRegister />)

    window.dispatchEvent(new Event('beforeinstallprompt'))
    expect(document.documentElement.dataset.everlumeInstallable).toBe('true')

    window.dispatchEvent(new Event('appinstalled'))
    expect(document.documentElement.dataset.everlumeInstalled).toBe('true')
    expect(document.documentElement.dataset.everlumeInstallable).toBeUndefined()
  })
})
