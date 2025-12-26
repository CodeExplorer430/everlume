'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Photo {
  id: string
  storage_path: string
  thumb_path: string
  caption?: string
}

interface PublicGalleryProps {
  photos: Photo[]
}

export function PublicGallery({ photos }: PublicGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const supabase = createClient()

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
          const thumbUrl = supabase.storage.from('tributes').getPublicUrl(photo.thumb_path).data.publicUrl
          return (
            <motion.div
              key={photo.id}
              layoutId={photo.id}
              onClick={() => openLightbox(index)}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-shadow"
            >
              <img
                src={thumbUrl}
                alt={photo.caption || 'Memory'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-10"
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
                src={supabase.storage.from('tributes').getPublicUrl(photos[selectedIndex].storage_path).data.publicUrl}
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
