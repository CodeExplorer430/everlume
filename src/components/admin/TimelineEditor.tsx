'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Trash2, Plus } from 'lucide-react'

interface TimelineEditorProps {
  memorialId: string
}

export function TimelineEditor({ memorialId }: TimelineEditorProps) {
  type TimelineEvent = {
    id: string
    year: number
    text: string
  }

  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [newYear, setNewYear] = useState('')
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fetchEvents = useCallback(async () => {
    const response = await fetch(
      `/api/admin/memorials/${memorialId}/timeline`,
      { cache: 'no-store' }
    )
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string
      } | null
      setErrorMessage(payload?.message || 'Unable to load timeline events.')
      setEvents([])
      setLoading(false)
      return
    }

    const payload = (await response.json()) as { events?: TimelineEvent[] }
    setEvents(payload.events ?? [])
    setLoading(false)
  }, [memorialId])

  useEffect(() => {
    const kickoff = setTimeout(() => {
      void fetchEvents()
    }, 0)

    return () => clearTimeout(kickoff)
  }, [fetchEvents])

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setAdding(true)

    const year = parseInt(newYear, 10)
    const response = await fetch('/api/admin/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memorialId,
        year,
        text: newText,
      }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string
      } | null
      setErrorMessage(payload?.message || 'Unable to add timeline event.')
      setAdding(false)
      return
    }

    const payload = (await response.json()) as { event?: TimelineEvent }
    setNewYear('')
    setNewText('')
    if (payload.event) {
      setEvents((current) =>
        [...current, payload.event!].sort((a, b) => a.year - b.year)
      )
    } else {
      fetchEvents()
    }
    setAdding(false)
  }

  const deleteEvent = async (id: string) => {
    if (deletingId) return
    setErrorMessage(null)
    const previous = events
    setDeletingId(id)
    setEvents((current) => current.filter((event) => event.id !== id))

    const response = await fetch(`/api/admin/timeline/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string
      } | null
      setErrorMessage(payload?.message || 'Unable to delete timeline event.')
      setEvents(previous)
      setDeletingId(null)
      return
    }
    setDeletingId(null)
  }

  if (loading)
    return (
      <div className="text-sm text-muted-foreground">Loading timeline...</div>
    )

  return (
    <div className="space-y-5">
      <form onSubmit={addEvent} className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="sm:w-24"
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
          <Button
            type="submit"
            size="icon"
            aria-label="Add timeline event"
            disabled={adding}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
      {errorMessage && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <ul className="space-y-2">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex items-start justify-between rounded-md border border-border bg-secondary/40 p-3"
          >
            <div className="pr-2 text-sm">
              <span className="mr-2 font-semibold">{event.year}</span>
              <span className="text-muted-foreground">{event.text}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteEvent(event.id)}
              aria-label="Delete timeline event"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
