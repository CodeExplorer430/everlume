import { render, waitFor } from '@testing-library/react'
import { ServiceWorkerRegister } from '@/components/public/ServiceWorkerRegister'

function deferredRegistration() {
  let resolve: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve: resolve! }
}

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

  it('does nothing in production when service workers are unsupported', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    Reflect.deleteProperty(window.navigator, 'serviceWorker')

    render(<ServiceWorkerRegister />)

    await waitFor(() => {
      expect(
        document.documentElement.dataset.everlumeOfflineReady
      ).toBeUndefined()
      expect(
        document.documentElement.dataset.everlumeInstallable
      ).toBeUndefined()
      expect(document.documentElement.dataset.everlumeInstalled).toBeUndefined()
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

  it('removes listeners on unmount and does not mark offline-ready after disposal', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const registration = deferredRegistration()
    const register = vi.fn().mockImplementation(() => registration.promise)
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    })

    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')

    const { unmount } = render(<ServiceWorkerRegister />)

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('/sw.js')
    })

    unmount()
    registration.resolve()
    await Promise.resolve()

    expect(
      document.documentElement.dataset.everlumeOfflineReady
    ).toBeUndefined()
    expect(removeEventListener).toHaveBeenCalledWith(
      'beforeinstallprompt',
      addEventListener.mock.calls.find(
        ([eventName]) => eventName === 'beforeinstallprompt'
      )?.[1]
    )
    expect(removeEventListener).toHaveBeenCalledWith(
      'appinstalled',
      addEventListener.mock.calls.find(
        ([eventName]) => eventName === 'appinstalled'
      )?.[1]
    )
  })
})
