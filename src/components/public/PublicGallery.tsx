'use client'

import { useState } from 'react'
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo, index) => {
          const thumbUrl = photo.thumb_url || photo.image_url || ''
          return (
            <motion.div
              key={photo.id}
              layoutId={photo.id}
              onClick={() => openLightbox(index)}
              className="relative aspect-square bg-secondary rounded-lg overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-shadow"
            >
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt={photo.caption || 'Memory'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  Missing image URL
                </div>
              )}
              <div className="absolute inset-0 bg-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/95 p-4 md:p-10"
          >
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-50"
            >
              <X className="h-8 w-8" />
            </button>

            <button
              onClick={prevImage}
              className="absolute left-4 md:left-10 text-white/70 hover:text-white transition-colors z-50"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>

            <button
              onClick={nextImage}
              className="absolute right-4 md:right-10 text-white/70 hover:text-white transition-colors z-50"
            >
              <ChevronRight className="h-10 w-10" />
            </button>

            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <motion.img
                key={photos[selectedIndex].id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                src={photos[selectedIndex].image_url || photos[selectedIndex].thumb_url || ''}
                alt={photos[selectedIndex].caption || 'Memory'}
                className="max-w-full max-h-[85vh] object-contain shadow-2xl"
              />
              {photos[selectedIndex].caption && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 text-white text-lg font-light italic text-center max-w-2xl"
                >
                  {photos[selectedIndex].caption}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
