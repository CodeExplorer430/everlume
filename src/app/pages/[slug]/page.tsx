import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { GuestbookForm } from '@/components/public/GuestbookForm'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function PublicTributePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!page) {
    notFound()
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('page_id', page.id)
    .order('sort_index', { ascending: true })

  const { data: guestbook } = await supabase
    .from('guestbook')
    .select('*')
    .eq('page_id', page.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

  const { data: timeline } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('page_id', page.id)
    .order('year', { ascending: true })

  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .eq('page_id', page.id)
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[60vh] bg-gray-900 flex items-center justify-center text-white overflow-hidden">
        {page.hero_image_url ? (
          <img
            src={page.hero_image_url}
            alt={page.full_name || page.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 opacity-60" />
        )}
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">{page.title}</h1>
          <p className="text-xl md:text-2xl font-light italic">{page.full_name}</p>
          {(page.dob || page.dod) && (
            <p className="mt-4 text-lg md:text-xl tracking-widest uppercase">
              {page.dob ? format(new Date(page.dob), 'MMMM d, yyyy') : '...'} — {page.dod ? format(new Date(page.dod), 'MMMM d, yyyy') : 'Present'}
            </p>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 space-y-20">
        <section className="text-center space-y-6">
          <h2 className="text-3xl font-serif font-semibold text-gray-800">Our Memories</h2>
          <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Welcome to the digital tribute for {page.full_name || 'our loved one'}. We invite you to explore the gallery and leave a message in the guestbook.
          </p>
        </section>

        {/* Gallery Section */}
        <section className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos && photos.length > 0 ? (
              photos.map((photo: any) => {
                const displayUrl = supabase.storage.from('tributes').getPublicUrl(photo.storage_path).data.publicUrl
                const thumbUrl = supabase.storage.from('tributes').getPublicUrl(photo.thumb_path).data.publicUrl
                return (
                  <div key={photo.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-shadow">
                    <img
                      src={thumbUrl}
                      alt={photo.caption || 'Memory'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )
              })
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400 italic bg-gray-50 rounded-lg">
                No photos shared yet.
              </div>
            )}
          </div>
        </section>

        {/* Videos Section */}
        {videos && videos.length > 0 && (
          <section className="space-y-12 border-t border-gray-100 pt-16">
            <div className="text-center">
              <h2 className="text-3xl font-serif font-semibold text-gray-800">Videos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {videos.map((video: any) => (
                <div key={video.id} className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.provider_id}`}
                      className="w-full h-full"
                      allowFullScreen
                      title={video.title}
                    />
                  </div>
                  {video.title && (
                    <p className="text-center text-gray-700 font-medium">{video.title}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline Section */}
        <section className="space-y-12 border-t border-gray-100 pt-16">
          <div className="text-center">
            <h2 className="text-3xl font-serif font-semibold text-gray-800">Life Timeline</h2>
          </div>
          
          <div className="max-w-2xl mx-auto">
            {timeline && timeline.length > 0 ? (
              <div className="relative border-l-2 border-gray-200 ml-4 space-y-10 pb-4">
                {timeline.map((event: any) => (
                  <div key={event.id} className="relative pl-8">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-blue-600 tracking-wider">{event.year}</span>
                      <p className="text-gray-700 leading-relaxed">{event.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 italic">No timeline events shared yet.</p>
            )}
          </div>
        </section>

        {/* Guestbook Section */}
        <section className="space-y-8 border-t border-gray-100 pt-16">
          <div className="text-center">
            <h2 className="text-3xl font-serif font-semibold text-gray-800">Guestbook</h2>
            <p className="text-gray-500 mt-2">Leave a message in memory of {page.full_name || 'our loved one'}.</p>
          </div>

          <div className="max-w-xl mx-auto">
            <GuestbookForm pageId={page.id} />
          </div>

          <div className="space-y-6 mt-12">
            {guestbook && guestbook.length > 0 ? (
              guestbook.map((entry: any) => (
                <div key={entry.id} className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-800 leading-relaxed mb-4 italic">"{entry.message}"</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-900">{entry.name}</span>
                    <span className="text-gray-400">{format(new Date(entry.created_at), 'MMMM d, yyyy')}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 italic">No messages yet. Be the first to share a memory.</p>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-gray-50 border-t border-gray-100 py-12 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} Digital Tribute — Created with love.</p>
      </footer>
    </div>
  )
}