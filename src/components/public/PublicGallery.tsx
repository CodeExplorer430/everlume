'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

interface Photo {
  id: string
  image_url?: string | null
  thumb_url?: string | null
  caption?: string
}

interface PublicGalleryProps {
  photos: Photo[]
  slideshowEnabled?: boolean
  slideshowIntervalMs?: number
  fit?: 'cover' | 'contain'
  captionStyle?: 'classic' | 'minimal'
}

export function PublicGallery({
  photos,
  slideshowEnabled = false,
  slideshowIntervalMs = 4500,
  fit = 'cover',
  captionStyle = 'classic',
}: PublicGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [slideshowPaused, setSlideshowPaused] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  const openLightbox = (index: number) => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null
    setSelectedIndex(index)
    setSlideshowPaused(false)
  }

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null)
    lastFocusedRef.current?.focus()
  }, [])

  const nextImage = useCallback(() => {
    setSelectedIndex((current) =>
      current !== null ? (current + 1) % photos.length : current
    )
  }, [photos.length])

  const prevImage = useCallback(() => {
    setSelectedIndex((current) =>
      current !== null ? (current - 1 + photos.length) % photos.length : current
    )
  }, [photos.length])

  useEffect(() => {
    if (selectedIndex === null) return

    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeLightbox()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        nextImage()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prevImage()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeLightbox, nextImage, prevImage, selectedIndex])

  useEffect(() => {
    if (selectedIndex === null) return
    if (!slideshowEnabled || slideshowPaused || photos.length < 2) return

    const intervalMs = Math.min(
      12000,
      Math.max(2000, slideshowIntervalMs || 4500)
    )
    const timer = window.setInterval(() => {
      nextImage()
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [
    selectedIndex,
    slideshowEnabled,
    slideshowPaused,
    slideshowIntervalMs,
    photos.length,
    nextImage,
  ])

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Gallery</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground md:text-3xl">
            Shared photographs and keepsakes
          </h2>
        </div>
        <div className="status-pill">
          {photos.length} photo{photos.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
        {photos.map((photo, index) => {
          const thumbUrl = photo.thumb_url || photo.image_url || ''
          const usesProtectedMediaProxy =
            thumbUrl.startsWith('/api/public/media/') ||
            (photo.image_url || '').startsWith('/api/public/media/')
          return (
            <button
              key={photo.id}
              onClick={() => openLightbox(index)}
              className="surface-card group relative aspect-square overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-md"
              aria-label={`Open photo ${index + 1}${photo.caption ? `: ${photo.caption}` : ''}`}
            >
              {thumbUrl ? (
                <Image
                  src={thumbUrl}
                  alt={photo.caption || `Memorial photo ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  unoptimized={usesProtectedMediaProxy}
                  className={`${fit === 'contain' ? 'object-contain bg-white/80 p-1.5' : 'object-cover'} transition-transform duration-500 group-hover:scale-105`}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Missing image URL
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 py-3 text-xs font-medium text-white/90 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                {photo.caption || `Open photo ${index + 1}`}
              </div>
            </button>
          )
        })}
      </div>

      {selectedIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(50,59,50,0.34),rgba(2,2,2,0.95))] p-4 md:p-10"
        >
          <button
            ref={closeButtonRef}
            onClick={closeLightbox}
            className="absolute right-5 top-5 text-white/75 transition-colors hover:text-white"
            aria-label="Close photo lightbox"
          >
            <X className="h-8 w-8" />
          </button>

          {slideshowEnabled && photos.length > 1 && (
            <button
              onClick={() => setSlideshowPaused((current) => !current)}
              className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-md border border-white/25 bg-black/35 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-black/55"
              aria-label={
                slideshowPaused ? 'Resume slideshow' : 'Pause slideshow'
              }
            >
              {slideshowPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              {slideshowPaused ? 'Resume' : 'Pause'}
            </button>
          )}

          <button
            onClick={prevImage}
            className="absolute left-3 text-white/75 transition-colors hover:text-white md:left-8"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-10 w-10" />
          </button>

          <button
            onClick={nextImage}
            className="absolute right-3 text-white/75 transition-colors hover:text-white md:right-8"
            aria-label="Next photo"
          >
            <ChevronRight className="h-10 w-10" />
          </button>

          <div className="relative flex h-full w-full flex-col items-center justify-center">
            {(() => {
              const selectedPhoto = photos[selectedIndex]
              const selectedSrc =
                selectedPhoto.image_url || selectedPhoto.thumb_url || ''
              const selectedAlt =
                selectedPhoto.caption || `Memorial photo ${selectedIndex + 1}`
              const selectedUsesProtectedMediaProxy =
                selectedSrc.startsWith('/api/public/media/')

              return (
                <>
                  <div className="mb-4 flex w-full max-w-6xl items-center justify-between gap-3 text-sm text-white/72">
                    <p>
                      Photo {selectedIndex + 1} of {photos.length}
                    </p>
                    <p className="hidden md:block">
                      Use arrow keys to move between photos.
                    </p>
                  </div>
                  <div className="relative h-[84vh] w-full max-w-6xl">
                    {selectedSrc ? (
                      <Image
                        src={selectedSrc}
                        alt={selectedAlt}
                        fill
                        sizes="100vw"
                        unoptimized={selectedUsesProtectedMediaProxy}
                        className={`rounded-[1.5rem] ${fit === 'contain' ? 'object-contain' : 'object-cover'} shadow-2xl transition-all duration-700`}
                        priority
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[1.5rem] border border-white/15 bg-black/20 text-sm text-white/80">
                        Missing image URL
                      </div>
                    )}
                  </div>
                  {selectedPhoto.caption && (
                    <p
                      className={`mt-5 text-center ${captionStyle === 'minimal' ? 'text-xs tracking-[0.06em] uppercase' : 'text-sm md:text-base'} text-white/90`}
                    >
                      {selectedPhoto.caption}
                    </p>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}
