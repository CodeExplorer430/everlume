'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Trash2, Plus, Youtube } from 'lucide-react'

interface VideoManagerProps {
  pageId: string
}

type VideoItem = {
  id: string
  provider_id: string
  title: string | null
}

export function VideoManager({ pageId }: VideoManagerProps) {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fetchVideos = useCallback(async () => {
    const response = await fetch(`/api/admin/pages/${pageId}/videos`, { cache: 'no-store' })
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
  }, [pageId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVideos()
  }, [fetchVideos])

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setAdding(true)

    const response = await fetch('/api/admin/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId,
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
        Upload videos to YouTube first, then paste the link here. For files larger than 100MB, direct app uploads are not supported.
      </div>
      <form onSubmit={addVideo} className="space-y-3">
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
              <Youtube className="h-5 w-5 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{video.title || 'Untitled Video'}</p>
              <p className="truncate text-xs text-muted-foreground">ID: {video.provider_id}</p>
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
