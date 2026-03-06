import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Heart, Link2, ShieldCheck, Sparkles } from 'lucide-react'

const highlights = [
  {
    title: 'Build the tribute page',
    text: 'Create a respectful memorial with stories, photos, milestones, and videos in one timeline.',
    icon: Heart,
  },
  {
    title: 'Share through short links',
    text: 'Use QR-ready short links for plaques and printed cards without changing physical materials later.',
    icon: Link2,
  },
  {
    title: 'Moderate with confidence',
    text: 'Approve messages, manage collaborators, and keep every published page family-approved.',
    icon: ShieldCheck,
  },
]

export function HomeLanding() {
  return <LandingContent directoryEnabled={false} memorials={[]} />
}

type LandingMemorial = {
  id: string
  title: string
  slug: string
  full_name: string | null
}

interface LandingContentProps {
  directoryEnabled: boolean
  memorials: LandingMemorial[]
}

export function LandingContent({ directoryEnabled, memorials }: LandingContentProps) {
  return (
    <div className="min-h-screen pb-14">
      <header className="page-container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-border/70 bg-[var(--surface-1)] p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-lg font-semibold tracking-wide">Everlume</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/login">Admin Login</Link>
        </Button>
      </header>

      <main id="main-content" className="page-container grid gap-8 py-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center md:py-14">
        <section className="space-y-6">
          <p className="inline-flex items-center rounded-full border border-border bg-[var(--surface-1)] px-3 py-1 text-xs font-medium text-muted-foreground">
            Built for families, parishes, and memorial teams
          </p>
          <h2 className="section-title max-w-xl text-balance">A modern memorial platform that keeps stories alive for future generations.</h2>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Everlume helps you preserve memory with a calm, mobile-first tribute page. Publish once, share anywhere, and maintain it from a secure admin dashboard.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/login">
                Open Admin
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>
        </section>

        <section className="surface-card relative overflow-hidden p-6 md:p-8">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute -bottom-12 left-12 h-40 w-40 rounded-full bg-accent/45 blur-3xl" />
          <div className="relative space-y-4">
            <div className="inline-flex rounded-full border border-border/70 bg-background/80 p-3 shadow-sm">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <blockquote className="text-xl font-medium leading-relaxed md:text-2xl">&quot;To live in hearts we leave behind is not to die.&quot;</blockquote>
            <p className="text-sm text-muted-foreground">A focused digital space for remembrance, reflection, and connection.</p>
          </div>
        </section>
      </main>

      <section id="how-it-works" className="page-container py-10 md:py-16">
        <div className="mb-8 space-y-2 md:mb-10">
          <h3 className="section-title">How Everlume Works</h3>
          <p className="max-w-2xl text-muted-foreground">Three practical steps from setup to sharing with family and friends.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((item, idx) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="surface-card p-5 md:p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step {idx + 1}</p>
                <div className="mb-4 inline-flex rounded-md border border-border/70 bg-secondary p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="mb-2 text-lg font-semibold">{item.title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      {directoryEnabled && (
        <section className="page-container py-4 md:py-8">
          <div className="mb-5 space-y-1">
            <h3 className="text-2xl font-semibold">Memorial Directory</h3>
            <p className="text-sm text-muted-foreground">Browse published memorial pages shared by family administrators.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {memorials.map((memorial) => (
              <article key={memorial.id} className="surface-card p-4">
                <h4 className="text-base font-semibold">{memorial.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{memorial.full_name || 'Memorial page'}</p>
                <Link href={`/memorials/${memorial.slug}`} className="mt-3 inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline">
                  View Memorial
                </Link>
              </article>
            ))}
            {memorials.length === 0 && (
              <div className="surface-card col-span-full p-5 text-sm text-muted-foreground">No memorial pages are listed yet.</div>
            )}
          </div>
        </section>
      )}

      <section className="page-container py-12">
        <div className="surface-card flex flex-col items-start justify-between gap-5 p-6 md:flex-row md:items-center md:p-8">
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold">Start your first memorial page today.</h3>
            <p className="text-sm text-muted-foreground">Create a page, add memories, and publish when your family is ready.</p>
          </div>
          <Button size="lg" asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
