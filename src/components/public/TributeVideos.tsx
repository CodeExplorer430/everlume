interface Video {
  id: string
  provider_id: string
  title: string | null
}

interface TributeVideosProps {
  videos: Video[]
}

export function TributeVideos({ videos }: TributeVideosProps) {
  if (!videos || videos.length === 0) return null

  return (
    <section className="space-y-12 border-t border-border pt-16">
      <div className="text-center">
        <h2 className="text-3xl font-serif font-semibold text-foreground">Videos</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {videos.map((video) => (
          <div key={video.id} className="space-y-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
              <iframe
                src={`https://www.youtube.com/embed/${video.provider_id}`}
                className="w-full h-full"
                allowFullScreen
                title={video.title || 'Video'}
              />
            </div>
            {video.title && (
              <p className="text-center text-muted-foreground font-medium">{video.title}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
