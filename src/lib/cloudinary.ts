export type CloudinaryTransformOptions = {
  width?: number
  quality?: 'auto' | number
  format?: 'auto' | 'webp' | 'jpg' | 'png'
  crop?: 'fill' | 'limit' | 'scale'
}

export function buildCloudinaryUrl(publicId: string, options: CloudinaryTransformOptions = {}): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName || !publicId) {
    return ''
  }

  const transforms: string[] = []

  if (options.crop) transforms.push(`c_${options.crop}`)
  if (options.width) transforms.push(`w_${options.width}`)
  if (options.quality !== undefined) transforms.push(`q_${options.quality}`)
  if (options.format) transforms.push(`f_${options.format}`)

  const transformSegment = transforms.length > 0 ? `${transforms.join(',')}/` : ''
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformSegment}${publicId}`
}

export function normalizeCloudinaryPublicId(publicIdOrUrl: string): string {
  if (!publicIdOrUrl) return ''

  if (!publicIdOrUrl.includes('/image/upload/')) {
    return publicIdOrUrl
  }

  const [, tail] = publicIdOrUrl.split('/image/upload/')
  const cleanTail = tail.replace(/^v\d+\//, '')
  return cleanTail
}
