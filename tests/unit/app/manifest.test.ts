import manifest from '@/app/manifest'

describe('app/manifest', () => {
  it('returns expected web manifest metadata', () => {
    expect(manifest()).toEqual(
      expect.objectContaining({
        name: 'Everlume',
        short_name: 'Everlume',
        id: '/',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#efede4',
        theme_color: '#5f7966',
        icons: expect.arrayContaining([
          expect.objectContaining({
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          }),
        ]),
        shortcuts: expect.arrayContaining([
          expect.objectContaining({ name: 'Browse Memorials', url: '/#memorial-directory' }),
          expect.objectContaining({ name: 'Offline Help', url: '/offline' }),
        ]),
      })
    )
  })
})
