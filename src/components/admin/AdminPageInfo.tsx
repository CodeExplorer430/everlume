/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Globe, Lock } from 'lucide-react'

interface AdminPageInfoProps {
  page: any
  onUpdate: () => void
}

export function AdminPageInfo({ page, onUpdate }: AdminPageInfoProps) {
  const [formData, setFormData] = useState(page)
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setFormData(page)
  }, [page])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    const { error } = await supabase
      .from('pages')
      .update({
        title: formData.title,
        slug: formData.slug,
        full_name: formData.full_name,
        dob: formData.dob,
        dod: formData.dod,
        privacy: formData.privacy,
      })
      .eq('id', page.id)
    
    if (error) alert(error.message)
    else onUpdate() // Trigger refresh
    setUpdating(false)
  }

  const togglePrivacy = () => {
    setFormData({ ...formData, privacy: formData.privacy === 'public' ? 'private' : 'public' })
  }

  return (
    <form onSubmit={handleUpdate} className="bg-card p-6 rounded-lg shadow-sm border border-border space-y-4">
      <h3 className="font-semibold text-foreground border-b border-border pb-2 mb-4">Basic Information</h3>
      
      <div className="flex items-center justify-between bg-secondary p-3 rounded-md border border-border">
        <div className="flex items-center space-x-2">
          {formData.privacy === 'public' ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-amber-600" />}
          <span className="text-sm font-medium text-foreground capitalize">{formData.privacy} Mode</span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={togglePrivacy}>
          Switch to {formData.privacy === 'public' ? 'Private' : 'Public'}
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">Page Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="bg-background border-input"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">Slug</label>
        <Input
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          className="bg-background border-input"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">Full Name</label>
        <Input
          value={formData.full_name || ''}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          className="bg-background border-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground">DOB</label>
          <Input
            type="date"
            value={formData.dob || ''}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            className="bg-background border-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">DOD</label>
          <Input
            type="date"
            value={formData.dod || ''}
            onChange={(e) => setFormData({ ...formData, dod: e.target.value })}
            className="bg-background border-input"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={updating}>
        {updating ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}
