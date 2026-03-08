'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Trash2, Plus, Youtube, Upload, Film } from 'lucide-react'

interface VideoManagerProps {
  memorialId?: string
  pageId?: string
}

type VideoItem = {
  id: string
  provider: 'youtube' | 'cloudinary' | null
  provider_id: string
  title: string | null
}

type UploadJobStatus = 'queued' | 'uploading' | 'processing' | 'completed' | 'fallback_required' | 'failed' | 'attached'

type UploadJob = {
  id: string
  status: UploadJobStatus
  uploadUrl?: string
  uploadMethod?: string
  error_message?: string | null
}

export function VideoManager({ memorialId, pageId }: VideoManagerProps) {
  const resolvedMemorialId = memorialId || pageId || ''
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [fileTitle, setFileTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [activeJob, setActiveJob] = useState<UploadJob | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fetchVideos = useCallback(async () => {
    const response = await fetch(`/api/admin/memorials/${resolvedMemorialId}/videos`, { cache: 'no-store' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to load videos.')
      setVideos([])
      setLoading(false)
      return
    }

    const payload = (await response.json()) as { videos?: VideoItem[] }
    setVideos(payload.videos ?? [])
    setLoading(false)
  }, [resolvedMemorialId])

  useEffect(() => {
    const kickoff = setTimeout(() => {
      void fetchVideos()
    }, 0)

    return () => clearTimeout(kickoff)
  }, [fetchVideos])

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setAdding(true)

    const response = await fetch('/api/admin/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memorialId: resolvedMemorialId,
        url,
        title,
      }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to add video.')
      setAdding(false)
      return
    }

    const payload = (await response.json()) as { video?: VideoItem }
    setUrl('')
    setTitle('')
    if (payload.video) {
      setVideos((current) => [...current, payload.video!])
    } else {
      fetchVideos()
    }
    setAdding(false)
  }

  const pollJobUntilDone = useCallback(async (jobId: string) => {
    let attempts = 0
    while (attempts < 40) {
      attempts += 1
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const statusResponse = await fetch(`/api/admin/videos/uploads/${jobId}`, { cache: 'no-store' })
      if (!statusResponse.ok) {
        const payload = (await statusResponse.json().catch(() => null)) as { message?: string } | null
        setErrorMessage(payload?.message || 'Unable to check video processing status.')
        return
      }

      const payload = (await statusResponse.json()) as { job?: UploadJob }
      const job = payload.job
      if (!job) {
        setErrorMessage('Upload job response was invalid.')
        return
      }

      setActiveJob(job)

      if (job.status === 'processing' || job.status === 'queued' || job.status === 'uploading') {
        continue
      }

      if (job.status === 'completed') {
        const attachResponse = await fetch(`/api/admin/videos/uploads/${jobId}/attach`, { method: 'POST' })
        if (!attachResponse.ok) {
          const attachPayload = (await attachResponse.json().catch(() => null)) as { message?: string } | null
          setErrorMessage(attachPayload?.message || 'Unable to attach processed video.')
          return
        }

        const attachPayload = (await attachResponse.json()) as { video?: VideoItem }
        if (attachPayload.video) {
          setVideos((current) => [...current, attachPayload.video!])
        } else {
          await fetchVideos()
        }
        setSelectedFile(null)
        setFileTitle('')
        return
      }

      if (job.status === 'fallback_required') {
        setErrorMessage(
          'Video still exceeds the 100MB Cloudinary limit after compression. Upload as YouTube Unlisted, then paste the link above.'
        )
        return
      }

      if (job.status === 'failed') {
        setErrorMessage(job.error_message || 'Video processing failed. Please try again or use YouTube Unlisted.')
        return
      }

      if (job.status === 'attached') {
        await fetchVideos()
        return
      }
    }

    setErrorMessage('Processing timed out. Please refresh and check upload status.')
  }, [fetchVideos])

  const uploadAndProcessFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setErrorMessage('Choose a video file first.')
      return
    }
    setErrorMessage(null)
    setUploadingFile(true)
    setActiveJob(null)

    const initResponse = await fetch('/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memorialId: resolvedMemorialId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || 'video/mp4',
        title: fileTitle,
      }),
    })

    if (!initResponse.ok) {
      const payload = (await initResponse.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to initialize file upload.')
      setUploadingFile(false)
      return
    }

    const initPayload = (await initResponse.json()) as {
      job?: { id: string; status: UploadJobStatus; uploadUrl: string; uploadMethod?: string }
    }
    const job = initPayload.job
    if (!job?.id || !job.uploadUrl) {
      setErrorMessage('Upload job response was invalid.')
      setUploadingFile(false)
      return
    }

    setActiveJob({ id: job.id, status: job.status, uploadUrl: job.uploadUrl, uploadMethod: job.uploadMethod })

    const uploadResponse = await fetch(job.uploadUrl, {
      method: job.uploadMethod || 'PUT',
      headers: {
        'Content-Type': selectedFile.type || 'application/octet-stream',
      },
      body: selectedFile,
    })

    if (!uploadResponse.ok) {
      setErrorMessage('File upload failed before compression started.')
      setUploadingFile(false)
      return
    }

    const startResponse = await fetch(`/api/admin/videos/uploads/${job.id}/start`, { method: 'POST' })
    if (!startResponse.ok) {
      const payload = (await startResponse.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to start video processing.')
      setUploadingFile(false)
      return
    }

    setActiveJob((current) => (current ? { ...current, status: 'processing' } : current))
    await pollJobUntilDone(job.id)
    setUploadingFile(false)
  }

  const deleteVideo = async (id: string) => {
    if (deletingId) return
    const previous = videos
    setDeletingId(id)
    setVideos((current) => current.filter((video) => video.id !== id))

    const response = await fetch(`/api/admin/videos/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to delete video.')
      setVideos(previous)
      setDeletingId(null)
      return
    }
    setErrorMessage(null)
    setDeletingId(null)
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading videos...</div>

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        Large videos can now be uploaded with server-side compression. If compression cannot reach 100MB, use YouTube Unlisted and paste the link here.
      </div>
      <form onSubmit={uploadAndProcessFile} className="space-y-3 rounded-md border border-border bg-secondary/30 p-3">
        <p className="text-sm font-medium">Upload and Compress (100MB Cloudinary Free Tier)</p>
        <Input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          disabled={uploadingFile}
        />
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="Uploaded File Title (Optional)"
            value={fileTitle}
            onChange={(e) => setFileTitle(e.target.value)}
            disabled={uploadingFile}
          />
          <Button type="submit" size="icon" aria-label="Upload and process video" disabled={uploadingFile || !selectedFile}>
            {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
        </div>
        {activeJob ? (
          <p className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
            Job {activeJob.id.slice(0, 8)} status: <span className="font-semibold uppercase">{activeJob.status}</span>
          </p>
        ) : null}
      </form>

      <form onSubmit={addVideo} className="space-y-3 rounded-md border border-border bg-secondary/20 p-3">
        <p className="text-sm font-medium">YouTube Unlisted URL</p>
        <Input
          placeholder="YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <Input className="flex-1" placeholder="Video Title (Optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit" size="icon" aria-label="Add video" disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        {errorMessage && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
      </form>

      <div className="space-y-2">
        {videos.map((video) => (
          <div key={video.id} className="flex items-center gap-3 rounded-md border border-border bg-secondary/45 p-3">
            <div className="rounded bg-red-100 p-2">
              {video.provider === 'cloudinary' ? <Film className="h-5 w-5 text-foreground" /> : <Youtube className="h-5 w-5 text-red-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{video.title || 'Untitled Video'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {video.provider === 'cloudinary' ? 'Cloudinary' : 'YouTube'} ID: {video.provider_id}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => deleteVideo(video.id)} aria-label="Delete video" disabled={deletingId === video.id}>
              {deletingId === video.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
