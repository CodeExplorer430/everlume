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
}

export function PublicGallery({ photos, slideshowEnabled = false, slideshowIntervalMs = 4500 }: PublicGalleryProps) {
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
    setSelectedIndex((current) => (current !== null ? (current + 1) % photos.length : current))
  }, [photos.length])

  const prevImage = useCallback(() => {
    setSelectedIndex((current) => (current !== null ? (current - 1 + photos.length) % photos.length : current))
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

    const intervalMs = Math.min(12000, Math.max(2000, slideshowIntervalMs || 4500))
    const timer = window.setInterval(() => {
      nextImage()
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [selectedIndex, slideshowEnabled, slideshowPaused, slideshowIntervalMs, photos.length, nextImage])

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
        {photos.map((photo, index) => {
          const thumbUrl = photo.thumb_url || photo.image_url || ''
          return (
            <button
              key={photo.id}
              onClick={() => openLightbox(index)}
              className="surface-card relative aspect-square overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-md"
              aria-label={`Open photo ${index + 1}${photo.caption ? `: ${photo.caption}` : ''}`}
            >
              {thumbUrl ? (
                <Image
                  src={thumbUrl}
                  alt={photo.caption || `Memorial photo ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Missing image URL</div>
              )}
            </button>
          )
        })}
      </div>

      {selectedIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4 md:p-10"
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
              aria-label={slideshowPaused ? 'Resume slideshow' : 'Pause slideshow'}
            >
              {slideshowPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
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
            <div className="relative h-[84vh] w-full max-w-6xl">
              <Image
                src={photos[selectedIndex].image_url || photos[selectedIndex].thumb_url || ''}
                alt={photos[selectedIndex].caption || `Memorial photo ${selectedIndex + 1}`}
                fill
                sizes="100vw"
                className="rounded-md object-contain shadow-2xl"
                priority
              />
            </div>
            {photos[selectedIndex].caption && <p className="mt-5 text-center text-sm text-white/90 md:text-base">{photos[selectedIndex].caption}</p>}
          </div>
        </div>
      )}
    </>
  )
}
