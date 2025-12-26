'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function NewTributePage() {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [dod, setDod] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('pages').insert({
      title,
      slug,
      full_name: fullName,
      dob: dob || null,
      dod: dod || null,
      owner_id: user.id,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.push('/admin')
      router.refresh()
    }
  }

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    if (!slug || slug === title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '')) {
      setSlug(newTitle.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, ''))
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Create New Tribute</h2>
        <p className="text-gray-600">Enter the details for the memorial page.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Page Title (e.g., In Loving Memory of...)</label>
            <Input
              required
              value={title}
              onChange={handleTitleChange}
              placeholder="In Loving Memory of Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">URL Slug</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                /pages/
              </span>
              <Input
                required
                className="rounded-l-none"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="jane-doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Elizabeth Doe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Death</label>
              <Input
                type="date"
                value={dod}
                onChange={(e) => setDod(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Tribute'}
          </Button>
        </div>
      </form>
    </div>
  )
}
