import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Everlume',
    short_name: 'Everlume',
    description: 'Digital memorials with short links, QR access, and family-led moderation.',
    start_url: '/',
    display: 'standalone',
    background_color: '#efede4',
    theme_color: '#5f7966',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
