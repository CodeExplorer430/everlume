import { buildCloudinaryUrl, normalizeCloudinaryPublicId } from '@/lib/cloudinary'

describe('cloudinary helpers', () => {
  const previous = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo-cloud'
  })

  afterAll(() => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = previous
  })

  it('builds base URL without transforms', () => {
    expect(buildCloudinaryUrl('folder/photo')).toBe(
      'https://res.cloudinary.com/demo-cloud/image/upload/folder/photo'
    )
  })

  it('builds URL with transforms', () => {
    expect(
      buildCloudinaryUrl('photo', { crop: 'fill', width: 400, quality: 'auto', format: 'auto' })
    ).toBe('https://res.cloudinary.com/demo-cloud/image/upload/c_fill,w_400,q_auto,f_auto/photo')
  })

  it('returns empty when cloud name is missing', () => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = ''
    expect(buildCloudinaryUrl('photo')).toBe('')
  })

  it('normalizes public id from cloudinary URL', () => {
    expect(normalizeCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v1740/tributes/a.jpg')).toBe(
      'tributes/a.jpg'
    )
  })

  it('returns raw value when value is already a public id', () => {
    expect(normalizeCloudinaryPublicId('tributes/raw.jpg')).toBe('tributes/raw.jpg')
  })
})
