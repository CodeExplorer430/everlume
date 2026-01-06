/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus, Youtube } from 'lucide-react'

interface VideoManagerProps {
  pageId: string
}

export function VideoManager({ pageId }: VideoManagerProps) {
  const [videos, setVideos] = useState<any[]>([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchVideos = useCallback(async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .eq('page_id', pageId)
      .order('created_at', { ascending: true })
    
    setVideos(data || [])
    setLoading(false)
  }, [pageId, supabase])

  useEffect(() => {
    fetchVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    const videoId = getYoutubeId(url)
    if (!videoId) {
      alert('Invalid YouTube URL')
      return
    }

    const { error } = await supabase.from('videos').insert({
      page_id: pageId,
      provider: 'youtube',
      provider_id: videoId,
      title: title
    })

    if (error) alert(error.message)
    else {
      setUrl('')
      setTitle('')
      fetchVideos()
    }
  }

  const deleteVideo = async (id: string) => {
    await supabase.from('videos').delete().eq('id', id)
    fetchVideos()
  }

  if (loading) return <div>Loading videos...</div>

  return (
    <div className="space-y-6">
      <form onSubmit={addVideo} className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <div className="flex space-x-2">
            <Input
              className="flex-1"
              placeholder="Video Title (Optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Button type="submit" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4">
        {videos.map((video) => (
          <div key={video.id} className="flex items-center space-x-4 bg-gray-50 p-3 rounded border border-gray-100">
            <div className="flex-shrink-0 bg-red-100 p-2 rounded">
              <Youtube className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {video.title || 'Untitled Video'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                ID: {video.provider_id}
              </p>
            </div>
            <button onClick={() => deleteVideo(video.id)} className="text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
