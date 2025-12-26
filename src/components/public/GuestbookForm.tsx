'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface GuestbookFormProps {
  pageId: string
}

export function GuestbookForm({ pageId }: GuestbookFormProps) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: insertError } = await supabase.from('guestbook').insert({
      page_id: pageId,
      name,
      message,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      setSubmitted(true)
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
        <h4 className="text-green-800 font-semibold">Thank you for your message</h4>
        <p className="text-green-700 text-sm mt-1">
          Your message has been submitted and will be visible after moderation.
        </p>
        <Button 
          variant="outline" 
          className="mt-4 border-green-200 text-green-700 hover:bg-green-100"
          onClick={() => {
            setSubmitted(false)
            setName('')
            setMessage('')
          }}
        >
          Write another message
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., John Smith"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Your Message</label>
        <textarea
          required
          rows={4}
          className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share a memory or words of comfort..."
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Submitting...' : 'Post to Guestbook'}
      </Button>
    </form>
  )
}
