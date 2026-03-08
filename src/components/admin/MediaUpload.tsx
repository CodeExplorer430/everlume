'use client'

import { useCallback, useState } from 'react'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import { Loader2, Upload } from 'lucide-react'
import { buildCloudinaryUrl, normalizeCloudinaryPublicId } from '@/lib/cloudinary'

interface MediaUploadProps {
  memorialId: string
  onUploadComplete: () => void
}

type CloudinaryUploadResult = {
  event?: string
  info?: {
    original_filename?: string
    public_id?: string
    secure_url?: string
    bytes?: number
    format?: string
    width?: number
    height?: number
  }
}

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        cb: (error: Error | null, result: CloudinaryUploadResult) => void
      ) => { open: () => void }
    }
  }
}

export function MediaUpload({ memorialId, onUploadComplete }: MediaUploadProps) {
  const [widgetReady, setWidgetReady] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  const registerPhoto = useCallback(
    async (info: NonNullable<CloudinaryUploadResult['info']>) => {
      const publicId = normalizeCloudinaryPublicId(info.public_id || info.secure_url || '')
      const imageUrl = info.secure_url || buildCloudinaryUrl(publicId)
      const thumbUrl = buildCloudinaryUrl(publicId, {
        crop: 'fill',
        width: 400,
        format: 'auto',
        quality: 'auto',
      })

      const response = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memorialId,
          caption: info.original_filename || '',
          cloudinaryPublicId: publicId,
          imageUrl,
          thumbUrl,
          bytes: info.bytes ?? null,
          format: info.format ?? null,
          width: info.width ?? null,
          height: info.height ?? null,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message || 'Failed to save uploaded image metadata.')
      }
    },
    [memorialId]
  )

  const openWidget = useCallback(() => {
    if (!window.cloudinary || !cloudName || !uploadPreset) {
      setErrorMessage('Cloudinary is not configured. Check NEXT_PUBLIC_CLOUDINARY_* env vars.')
      return
    }

    setErrorMessage(null)
    setUploading(true)

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName,
        uploadPreset,
        folder: `everlume/${memorialId}`,
        resourceType: 'image',
        sources: ['local', 'camera'],
        multiple: true,
        maxFiles: 50,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
      },
      async (error, result) => {
        if (error) {
          setUploading(false)
          setErrorMessage(error.message)
          return
        }

        if (!result) return

        if (result.event === 'success' && result.info) {
          try {
            await registerPhoto(result.info)
            setUploadedCount((prev) => prev + 1)
          } catch (dbError: unknown) {
            const message = dbError instanceof Error ? dbError.message : 'Failed to save uploaded image metadata.'
            setErrorMessage(message)
          }
        }

        if (result.event === 'queues-end' || result.event === 'close') {
          setUploading(false)
          onUploadComplete()
        }
      }
    )

    widget.open()
  }, [cloudName, memorialId, onUploadComplete, registerPhoto, uploadPreset])

  return (
    <div className="surface-card space-y-4 border-2 border-dashed p-6">
      <Script src="https://upload-widget.cloudinary.com/global/all.js" onLoad={() => setWidgetReady(true)} />

      <div className="space-y-2 text-center">
        <div className="mx-auto inline-flex rounded-full bg-secondary p-3">
          <Upload className="h-5 w-5 text-foreground/85" />
        </div>
        <p className="text-sm font-medium">Upload photos with Cloudinary (bulk supported)</p>
        <p className="text-xs text-muted-foreground">Images are optimized for delivery through Cloudinary URL transformations.</p>
      </div>

      <Button onClick={openWidget} disabled={!widgetReady || uploading} className="w-full">
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          'Open Cloudinary Uploader'
        )}
      </Button>

      {uploadedCount > 0 && <p className="text-xs text-emerald-700">Uploaded images this session: {uploadedCount}</p>}
      {errorMessage && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{errorMessage}</p>}
      {!cloudName || !uploadPreset ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Missing `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` or `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
        </p>
      ) : null}
    </div>
  )
}
