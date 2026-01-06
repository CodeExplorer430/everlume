import { format } from 'date-fns'
import { GuestbookForm } from '@/components/public/GuestbookForm'

interface GuestbookEntry {
  id: string
  name: string
  message: string
  created_at: string
}

interface TributeGuestbookProps {
  pageId: string
  fullName: string | null
  entries: GuestbookEntry[]
}

export function TributeGuestbook({ pageId, fullName, entries }: TributeGuestbookProps) {
  return (
    <section className="space-y-8 border-t border-border pt-16">
      <div className="text-center">
        <h2 className="text-3xl font-serif font-semibold text-foreground">Guestbook</h2>
        <p className="text-muted-foreground mt-2">Leave a message in memory of {fullName || 'our loved one'}.</p>
      </div>

      <div className="max-w-xl mx-auto">
        <GuestbookForm pageId={pageId} />
      </div>

      <div className="space-y-6 mt-12">
        {entries && entries.length > 0 ? (
          entries.map((entry) => (
            <div key={entry.id} className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <p className="text-foreground leading-relaxed mb-4 italic">&quot;{entry.message}&quot;</p>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-foreground">{entry.name}</span>
                <span className="text-muted-foreground">{format(new Date(entry.created_at), 'MMMM d, yyyy')}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground italic">No messages yet. Be the first to share a memory.</p>
        )}
      </div>
    </section>
  )
}
