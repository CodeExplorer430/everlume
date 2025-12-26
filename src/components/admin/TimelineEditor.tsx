'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus } from 'lucide-react'

interface TimelineEditorProps {
  pageId: string
}

export function TimelineEditor({ pageId }: TimelineEditorProps) {
  const [events, setEvents] = useState<any[]>([])
  const [newYear, setNewYear] = useState('')
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('page_id', pageId)
      .order('year', { ascending: true })
    
    setEvents(data || [])
    setLoading(false)
  }, [pageId, supabase])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('timeline_events').insert({
      page_id: pageId,
      year: parseInt(newYear),
      text: newText
    })

    if (error) alert(error.message)
    else {
      setNewYear('')
      setNewText('')
      fetchEvents()
    }
  }

  const deleteEvent = async (id: string) => {
    await supabase.from('timeline_events').delete().eq('id', id)
    fetchEvents()
  }

  if (loading) return <div>Loading timeline...</div>

  return (
    <div className="space-y-6">
      <form onSubmit={addEvent} className="space-y-2">
        <div className="flex space-x-2">
          <Input
            className="w-24"
            type="number"
            placeholder="Year"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            required
          />
          <Input
            className="flex-1"
            placeholder="Event description..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            required
          />
          <Button type="submit" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <ul className="space-y-3">
        {events.map((event) => (
          <li key={event.id} className="flex items-start justify-between bg-gray-50 p-3 rounded border border-gray-100">
            <div>
              <span className="font-bold text-gray-900 mr-2">{event.year}</span>
              <span className="text-gray-700">{event.text}</span>
            </div>
            <button onClick={() => deleteEvent(event.id)} className="text-red-500 hover:text-red-700 ml-2">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
