import { format } from 'date-fns'
import { GuestbookForm } from '@/components/public/GuestbookForm'

interface GuestbookEntry {
  id: string
  name: string
  message: string
  created_at: string
}

interface TributeGuestbookProps {
  memorialId?: string
  pageId?: string
  fullName: string | null
  entries: GuestbookEntry[]
}

export function TributeGuestbook({ memorialId, pageId, fullName, entries }: TributeGuestbookProps) {
  const resolvedMemorialId = memorialId || pageId || ''
  return (
    <section className="space-y-8 border-t border-border/80 pt-12">
      <div className="space-y-2 text-center">
        <h2 className="section-title">Guestbook</h2>
        <p className="text-sm text-muted-foreground">Leave a message in memory of {fullName || 'our loved one'}.</p>
      </div>

      <div className="mx-auto max-w-xl">
        <GuestbookForm memorialId={resolvedMemorialId} />
      </div>

      <div className="space-y-4 md:space-y-5">
        {entries && entries.length > 0 ? (
          entries.map((entry) => (
            <article key={entry.id} className="surface-card p-5 md:p-6">
              <p className="mb-4 text-sm leading-relaxed text-foreground/95 md:text-base">&quot;{entry.message}&quot;</p>
              <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
                <span className="font-semibold">{entry.name}</span>
                <span className="text-muted-foreground">{format(new Date(entry.created_at), 'MMMM d, yyyy')}</span>
              </div>
            </article>
          ))
        ) : (
          <p className="text-center text-sm italic text-muted-foreground">No messages yet. Be the first to share a memory.</p>
        )}
      </div>
    </section>
  )
}
