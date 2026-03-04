/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useCallback, useMemo, useState } from 'react'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, Upload } from 'lucide-react'
import { buildCloudinaryUrl, normalizeCloudinaryPublicId } from '@/lib/cloudinary'

interface MediaUploadProps {
  pageId: string
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

export function MediaUpload({ pageId, onUploadComplete }: MediaUploadProps) {
  const [widgetReady, setWidgetReady] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

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

      const { error } = await supabase.from('photos').insert({
        page_id: pageId,
        caption: info.original_filename || '',
        cloudinary_public_id: publicId,
        image_url: imageUrl,
        thumb_url: thumbUrl,
        bytes: info.bytes ?? null,
        format: info.format ?? null,
        width: info.width ?? null,
        height: info.height ?? null,
      })

      if (error) throw error
    },
    [pageId, supabase]
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
        folder: `tributes/${pageId}`,
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
          } catch (dbError: any) {
            setErrorMessage(dbError.message || 'Failed to save uploaded image metadata.')
          }
        }

        if (result.event === 'queues-end' || result.event === 'close') {
          setUploading(false)
          onUploadComplete()
        }
      }
    )

    widget.open()
  }, [cloudName, onUploadComplete, pageId, registerPhoto, uploadPreset])

  return (
    <div className="space-y-4 border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
      <Script src="https://upload-widget.cloudinary.com/global/all.js" onLoad={() => setWidgetReady(true)} />

      <div className="flex flex-col items-center justify-center space-y-2 text-center">
        <Upload className="h-10 w-10 text-gray-400" />
        <p className="text-sm text-gray-600">Upload photos with Cloudinary Upload Widget (bulk supported).</p>
        <p className="text-xs text-gray-500">Images are stored in Cloudinary and optimized with URL transformations.</p>
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
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
      {!cloudName || !uploadPreset ? (
        <p className="text-xs text-amber-600">
          Missing `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` or `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
        </p>
      ) : null}
    </div>
  )
}
