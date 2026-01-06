/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import imageCompression from 'browser-image-compression'
import { Loader2, Upload, X } from 'lucide-react'

interface MediaUploadProps {
  pageId: string
  onUploadComplete: () => void
}

export function MediaUpload({ pageId, onUploadComplete }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    setUploading(true)
    try {
      for (const file of files) {
        // 1. Compress image
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        }
        
        const compressedFile = await imageCompression(file, options)
        
        // Create thumbnail
        const thumbOptions = {
          maxSizeMB: 0.1,
          maxWidthOrHeight: 400,
          useWebWorker: true,
        }
        const thumbFile = await imageCompression(file, thumbOptions)

        // 2. Upload original (compressed)
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${pageId}/${fileName}`
        const thumbPath = `${pageId}/thumb_${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('tributes')
          .upload(filePath, compressedFile)

        if (uploadError) throw uploadError

        // 3. Upload thumbnail
        const { error: thumbUploadError } = await supabase.storage
          .from('tributes')
          .upload(thumbPath, thumbFile)

        if (thumbUploadError) throw thumbUploadError

        // 4. Register in database
        const { error: dbError } = await supabase.from('photos').insert({
          page_id: pageId,
          storage_path: filePath,
          thumb_path: thumbPath,
          caption: file.name,
        })

        if (dbError) throw dbError
      }
      
      setFiles([])
      onUploadComplete()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4 border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
      <div className="flex flex-col items-center justify-center space-y-2">
        <Upload className="h-10 w-10 text-gray-400" />
        <p className="text-sm text-gray-600">Select photos to upload (Bulk supported)</p>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          disabled={uploading}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
        >
          Browse Files
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <ul className="divide-y divide-gray-200">
            {files.map((file, index) => (
              <li key={index} className="py-2 flex items-center justify-between text-sm">
                <span className="truncate max-w-xs">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <Button
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${files.length} photos`
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
