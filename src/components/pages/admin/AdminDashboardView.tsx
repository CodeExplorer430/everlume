import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { TributeList } from '@/components/admin/TributeList'
import { ArrowRight, FileText, Link2, MessageCircleHeart } from 'lucide-react'

type PageSummary = {
  id: string
  title: string
  slug: string
  created_at: string
}

interface AdminDashboardViewProps {
  pages: PageSummary[]
}

export function AdminDashboardView({ pages }: AdminDashboardViewProps) {
  return (
    <div className="space-y-6">
      <section className="dashboard-hero surface-card relative overflow-hidden p-6 md:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-14 h-64 w-64 rounded-full bg-accent/35 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="section-kicker">Operations Overview</p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Dashboard</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Manage memorials, guestbook approvals, and QR-ready short links from one calmer control room.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/memorials/new">
              Create New Memorial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-card p-5">
          <div className="mb-3 inline-flex rounded-lg border border-border/60 bg-[var(--surface-1)] p-2">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Memorials</p>
          <p className="mt-1 text-3xl font-semibold">{pages.length}</p>
        </div>
        <div className="surface-card p-5">
          <div className="mb-3 inline-flex rounded-lg border border-border/60 bg-[var(--surface-1)] p-2">
            <MessageCircleHeart className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Moderation</p>
          <p className="mt-1 text-sm text-muted-foreground">Review guestbook entries before they become part of the public memorial.</p>
          <Link href="/admin/guestbook" className="mt-3 inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline">
            Open Guestbook
          </Link>
        </div>
        <div className="surface-card p-5">
          <div className="mb-3 inline-flex rounded-lg border border-border/60 bg-[var(--surface-1)] p-2">
            <Link2 className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Short Links</p>
          <p className="mt-1 text-sm text-muted-foreground">Configure QR-ready redirects that survive hosting/domain changes.</p>
          <Link href="/admin/settings" className="mt-3 inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline">
            Manage Redirects
          </Link>
        </div>
      </section>

      <TributeList pages={pages} />
    </div>
  )
}
