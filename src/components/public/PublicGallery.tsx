'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
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

  const openLightbox = (index: number) => setSelectedIndex(index)
  const closeLightbox = () => setSelectedIndex(null)

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

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
        {photos.map((photo, index) => {
          const thumbUrl = photo.thumb_url || photo.image_url || ''
          return (
            <motion.button
              key={photo.id}
              layoutId={photo.id}
              onClick={() => openLightbox(index)}
              className="surface-card relative aspect-square overflow-hidden text-left transition hover:-translate-y-0.5"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {thumbUrl ? (
                <Image
                  src={thumbUrl}
                  alt={photo.caption || 'Memory'}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Missing image URL</div>
              )}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4 md:p-10"
          >
            <button onClick={closeLightbox} className="absolute right-5 top-5 text-white/75 transition-colors hover:text-white">
              <X className="h-8 w-8" />
            </button>

            <button onClick={prevImage} className="absolute left-3 text-white/75 transition-colors hover:text-white md:left-8">
              <ChevronLeft className="h-10 w-10" />
            </button>

            <button onClick={nextImage} className="absolute right-3 text-white/75 transition-colors hover:text-white md:right-8">
              <ChevronRight className="h-10 w-10" />
            </button>

            <div className="relative flex h-full w-full flex-col items-center justify-center">
              <motion.div
                key={photos[selectedIndex].id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative h-[84vh] w-full max-w-6xl"
              >
                <Image
                  src={photos[selectedIndex].image_url || photos[selectedIndex].thumb_url || ''}
                  alt={photos[selectedIndex].caption || 'Memory'}
                  fill
                  sizes="100vw"
                  className="rounded-md object-contain shadow-2xl"
                  priority
                />
              </motion.div>
              {photos[selectedIndex].caption && <p className="mt-5 text-center text-sm text-white/90 md:text-base">{photos[selectedIndex].caption}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
