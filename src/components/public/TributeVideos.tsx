import { buildCloudinaryVideoUrl } from '@/lib/cloudinary'

interface Video {
  id: string
  provider: 'youtube' | 'cloudinary' | null
  provider_id: string
  title: string | null
}

interface TributeVideosProps {
  videos: Video[]
  layout?: 'grid' | 'featured'
}

function VideoFrame({ video }: { video: Video }) {
  return (
    <div className="aspect-video overflow-hidden rounded-md bg-black">
      {video.provider === 'cloudinary' ? (
        <video controls preload="metadata" className="h-full w-full" src={buildCloudinaryVideoUrl(video.provider_id, { quality: 'auto:good', format: 'mp4' })} />
      ) : (
        <iframe src={`https://www.youtube.com/embed/${video.provider_id}`} className="h-full w-full" allowFullScreen title={video.title || 'Video'} />
      )}
    </div>
  )
}

export function TributeVideos({ videos, layout = 'grid' }: TributeVideosProps) {
  if (!videos || videos.length === 0) return null

  const featured = layout === 'featured' ? videos[0] : null
  const remaining = layout === 'featured' ? videos.slice(1) : videos

  return (
    <section className="space-y-8 border-t border-border/80 pt-12">
      <div className="space-y-2 text-center">
        <h2 className="section-title">Video Memories</h2>
        <p className="text-sm text-muted-foreground">Recorded stories and moments from loved ones.</p>
      </div>
      {featured ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <article className="surface-card overflow-hidden p-3 md:p-4">
            <VideoFrame video={featured} />
            {featured.title && <p className="px-1 pt-3 text-sm font-medium text-muted-foreground">{featured.title}</p>}
          </article>
          <div className="space-y-4">
            {remaining.length > 0 ? (
              remaining.map((video) => (
                <article key={video.id} className="surface-card overflow-hidden p-3">
                  <VideoFrame video={video} />
                  {video.title && <p className="px-1 pt-2 text-sm font-medium text-muted-foreground">{video.title}</p>}
                </article>
              ))
            ) : (
              <div className="surface-card p-4 text-sm text-muted-foreground">No additional videos yet.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {videos.map((video) => (
            <article key={video.id} className="surface-card overflow-hidden p-3 md:p-4">
              <VideoFrame video={video} />
              {video.title && <p className="px-1 pt-3 text-sm font-medium text-muted-foreground">{video.title}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
