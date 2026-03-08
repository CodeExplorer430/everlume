import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Everlume',
    short_name: 'Everlume',
    description: 'Digital memorials with short links, QR access, and family-led moderation.',
    id: '/',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#efede4',
    theme_color: '#5f7966',
    categories: ['lifestyle', 'family', 'photo'],
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Browse Memorials',
        short_name: 'Memorials',
        url: '/#memorial-directory',
      },
      {
        name: 'Offline Help',
        short_name: 'Offline',
        url: '/offline',
      },
    ],
  }
}
