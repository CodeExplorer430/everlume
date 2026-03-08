'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let disposed = false

    const handleBeforeInstallPrompt = () => {
      document.documentElement.dataset.everlumeInstallable = 'true'
    }

    const handleInstalled = () => {
      delete document.documentElement.dataset.everlumeInstallable
      document.documentElement.dataset.everlumeInstalled = 'true'
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    navigator.serviceWorker.register('/sw.js').then(() => {
      if (!disposed) {
        document.documentElement.dataset.everlumeOfflineReady = 'true'
      }
    }).catch(() => {
      // Ignore registration errors for unsupported environments.
    })

    return () => {
      disposed = true
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  return null
}
