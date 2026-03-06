'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Photo {
  id: string
  image_url?: string | null
  thumb_url?: string | null
  caption?: string
}

interface PublicGalleryProps {
  photos: Photo[]
}

export function PublicGallery({ photos }: PublicGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  const openLightbox = (index: number) => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null
    setSelectedIndex(index)
  }

  const closeLightbox = () => {
    setSelectedIndex(null)
    lastFocusedRef.current?.focus()
  }

  const nextImage = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % photos.length)
    }
  }

  const prevImage = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + photos.length) % photos.length)
    }
  }

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
  }, [selectedIndex]) // eslint-disable-line react-hooks/exhaustive-deps

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
