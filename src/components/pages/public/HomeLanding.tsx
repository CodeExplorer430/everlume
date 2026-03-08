import Link from 'next/link'
import { ArrowRight, Heart, Link2, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const highlights = [
  {
    title: 'Build the tribute page',
    text: 'Shape a memorial with stories, milestones, photos, and film into a page that still feels dignified years from now.',
    icon: Heart,
  },
  {
    title: 'Share through short links',
    text: 'Generate QR-ready short links for plaques and printed cards so the memorial can move without reprinting materials.',
    icon: Link2,
  },
  {
    title: 'Moderate with confidence',
    text: 'Review guestbook messages, manage collaborators, and keep every public memory family-approved.',
    icon: ShieldCheck,
  },
]

const stats = [
  { label: 'Private admin controls', value: '3 roles' },
  { label: 'Visitor sharing', value: 'QR + short URL' },
  { label: 'Memorial upkeep', value: 'Anytime updates' },
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
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-border/70 bg-[var(--surface-1)] p-2.5 shadow-[0_12px_26px_rgba(43,51,42,0.08)]">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-wide text-foreground">Everlume</h1>
            <p className="text-xs text-muted-foreground">Digital tribute publishing for families</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/login">Admin Login</Link>
        </Button>
      </header>

      <main id="main-content" className="page-container grid gap-10 py-8 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] md:items-center md:py-16">
        <section className="space-y-7">
          <p className="pill-muted">Built for families, parishes, and memorial teams</p>
          <div className="space-y-5">
            <h2 className="section-title max-w-3xl text-balance">
              A memorial platform that feels respectful in public and dependable behind the scenes.
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Everlume helps families publish a tribute page with calm presentation, secure admin accounts, and QR-friendly sharing that can endure beyond one event or one device.
            </p>
          </div>
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
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="surface-card px-4 py-4">
                <p className="text-lg font-semibold text-foreground">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card relative overflow-hidden p-6 md:p-8">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-10 left-4 h-40 w-40 rounded-full bg-[rgba(220,200,157,0.45)] blur-3xl" />
          <div className="relative space-y-5">
            <div className="inline-flex rounded-full border border-border/70 bg-white/70 p-3 shadow-[0_14px_32px_rgba(43,51,42,0.08)]">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <blockquote className="font-display text-3xl leading-tight text-foreground md:text-4xl">
              &quot;To live in hearts we leave behind is not to die.&quot;
            </blockquote>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              A digital space for remembrance, reflection, and practical memorial stewardship, designed to remain useful long after the first day of sharing.
            </p>
          </div>
        </section>
      </main>

      <section id="how-it-works" className="page-container py-10 md:py-16">
        <div className="mb-8 space-y-2 md:mb-10">
          <p className="section-kicker">How It Works</p>
          <h3 className="section-title">Three measured steps from setup to remembrance.</h3>
          <p className="max-w-2xl text-muted-foreground">
            Everlume is built to help families move from creation to sharing without sacrificing privacy, care, or clarity.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((item, idx) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="surface-card p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Step {idx + 1}</p>
                <div className="mb-4 inline-flex rounded-2xl border border-border/70 bg-secondary p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      {directoryEnabled && (
        <section id="memorial-directory" className="page-container py-4 md:py-8">
          <div className="mb-5 space-y-1">
            <p className="section-kicker">Public Directory</p>
            <h3 className="text-2xl font-semibold">Memorial Directory</h3>
            <p className="text-sm text-muted-foreground">
              Browse memorials that families have chosen to publish publicly. Private and password-protected pages remain outside this directory.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {memorials.map((memorial) => (
              <article key={memorial.id} className="surface-card p-5">
                <h4 className="font-semibold text-foreground">{memorial.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{memorial.full_name || 'Memorial page'}</p>
                <Link href={`/memorials/${memorial.slug}`} className="mt-4 inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline">
                  View memorial
                </Link>
              </article>
            ))}
            {memorials.length === 0 && (
              <div className="surface-card col-span-full p-5 text-sm text-muted-foreground">
                Public memorial sharing is enabled, but no families have published a directory-listed memorial yet.
              </div>
            )}
          </div>
        </section>
      )}

      <section className="page-container py-12">
        <div className="surface-card flex flex-col items-start justify-between gap-5 overflow-hidden p-6 md:flex-row md:items-center md:p-8">
          <div className="space-y-2">
            <p className="section-kicker">Get Started</p>
            <h3 className="section-title text-[2.2rem]">Create the first memorial when your family is ready.</h3>
            <p className="max-w-xl text-sm text-muted-foreground">
              Publish the essential story first, then continue refining photos, timelines, moderation, and guestbook access over time.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/login">Open Admin</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
