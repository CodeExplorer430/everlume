import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { TributeList } from '@/components/admin/TributeList'
import { FileText, Link2 } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: pages } = await supabase.from('pages').select('*').order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <section className="surface-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Manage memorial pages, guestbook entries, and short links.</p>
        </div>
        <Button asChild>
          <Link href="/admin/memorials/new">Create New Memorial</Link>
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="surface-card p-5">
          <div className="mb-2 inline-flex rounded-md bg-secondary p-2">
            <FileText className="h-4 w-4" />
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total Pages</p>
          <p className="mt-1 text-3xl font-semibold">{pages?.length || 0}</p>
        </div>
        <div className="surface-card p-5">
          <div className="mb-2 inline-flex rounded-md bg-secondary p-2">
            <Link2 className="h-4 w-4" />
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Next Step</p>
          <p className="mt-1 text-sm text-muted-foreground">Set up short links in Settings and generate QR codes for plaques.</p>
        </div>
      </section>

      <TributeList pages={pages || []} />
    </div>
  )
}
