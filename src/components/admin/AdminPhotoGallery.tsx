'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Star, Image as ImageIcon } from 'lucide-react'

interface Photo {
  id: string
  storage_path?: string | null
  thumb_path?: string | null
  cloudinary_public_id?: string | null
  image_url?: string | null
  thumb_url?: string | null
  caption: string
  sort_index: number
}

interface AdminPhotoGalleryProps {
  photos: Photo[]
  heroImageUrl: string | null
  onRefresh: () => void
  onSetHero: (url: string) => void
}

export function AdminPhotoGallery({ photos, heroImageUrl, onRefresh, onSetHero }: AdminPhotoGalleryProps) {
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null)
  const [tempCaption, setTempCaption] = useState('')
  const supabase = createClient()

  const deletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    await supabase.from('photos').delete().eq('id', photoId)
    onRefresh()
  }

  const setHeroImage = async (photoUrl: string) => {
    onSetHero(photoUrl)
  }

  const startEditingCaption = (photo: Photo) => {
    setEditingPhoto(photo.id)
    setTempCaption(photo.caption || '')
  }

  const saveCaption = async (photoId: string) => {
    const { error } = await supabase.from('photos').update({ caption: tempCaption }).eq('id', photoId)

    if (error) alert(error.message)
    else {
      setEditingPhoto(null)
      onRefresh()
    }
  }

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
      <h3 className="font-semibold text-foreground border-b border-border pb-2 mb-6">Photo Gallery</h3>

      {photos.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground italic">No photos uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {photos.map((photo) => {
            const publicUrl = photo.thumb_url || photo.image_url || ''
            const fullImageUrl = photo.image_url || photo.thumb_url || ''
            const isHero = Boolean(heroImageUrl && fullImageUrl && heroImageUrl === fullImageUrl)

            return (
              <div key={photo.id} className="group flex flex-col space-y-2">
                <div className="relative aspect-square bg-secondary rounded-lg overflow-hidden border border-border">
                  {publicUrl ? (
                    <Image
                      src={publicUrl}
                      alt={photo.caption || 'Memorial photo'}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      Missing image URL
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setHeroImage(fullImageUrl)}
                      disabled={!fullImageUrl}
                    >
                      <ImageIcon className="mr-1 h-3 w-3" />
                      Set as Hero
                    </Button>
                    <Button variant="danger" size="sm" className="h-8 text-xs" onClick={() => deletePhoto(photo.id)}>
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                  {isHero && (
                    <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center">
                      <Star className="h-3 w-3 mr-1 fill-yellow-900" />
                      HERO
                    </div>
                  )}
                </div>

                {editingPhoto === photo.id ? (
                  <div className="flex space-x-2">
                    <Input
                      value={tempCaption}
                      onChange={(e) => setTempCaption(e.target.value)}
                      className="h-8 text-xs bg-background border-input"
                    />
                    <Button size="sm" className="h-8 px-2" onClick={() => saveCaption(photo.id)}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <p
                    className="text-xs text-muted-foreground truncate cursor-pointer hover:text-primary hover:underline"
                    onClick={() => startEditingCaption(photo)}
                    title="Click to edit caption"
                  >
                    {photo.caption || 'Add caption...'}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
