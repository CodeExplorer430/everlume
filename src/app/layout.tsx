import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegister } from '@/components/public/ServiceWorkerRegister'
import { getAppBaseUrl } from '@/lib/site-url'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: getAppBaseUrl(),
  title: 'Everlume',
  description: 'Create and share memorial pages with photos, timelines, videos, and moderated guestbook messages.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary/30`}>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
