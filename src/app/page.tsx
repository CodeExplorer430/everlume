import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Heart, Link2, ShieldCheck, Sparkles } from 'lucide-react'

const highlights = [
  {
    title: 'Create a lasting tribute',
    text: 'Build a memorial page with stories, photos, and videos that family can revisit anytime.',
    icon: Heart,
  },
  {
    title: 'Share with a stable short link',
    text: 'Generate plaque-ready QR links that can stay constant even when hosting changes.',
    icon: Link2,
  },
  {
    title: 'Keep family in control',
    text: 'Moderate guestbook entries, manage privacy, and export records whenever needed.',
    icon: ShieldCheck,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen pb-12">
      <header className="page-container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary/25 p-2">
            <Sparkles className="h-4 w-4 text-foreground" />
          </div>
          <h1 className="text-lg font-semibold tracking-wide">Everlume</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/login">Admin Login</Link>
        </Button>
      </header>

      <main className="page-container grid gap-8 py-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-center md:py-14">
        <section className="space-y-6">
          <p className="inline-flex items-center rounded-full border border-border bg-[var(--surface-1)] px-3 py-1 text-xs font-medium text-muted-foreground">
            Memorial pages designed for families
          </p>
          <h2 className="section-title max-w-xl text-balance">
            Preserve their story with a beautiful, mobile-first digital memorial.
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Collect photos, timeline moments, guestbook messages, and videos in one memorial page. Share it through a short URL and a print-ready QR for memorial plaques.
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
            <div className="inline-flex rounded-full bg-background/80 p-3 shadow-sm">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <blockquote className="text-xl font-medium leading-relaxed md:text-2xl">
              &quot;To live in hearts we leave behind is not to die.&quot;
            </blockquote>
            <p className="text-sm text-muted-foreground">A calm digital space for remembrance and connection.</p>
          </div>
        </section>
      </main>

      <section id="how-it-works" className="page-container py-10 md:py-16">
        <div className="mb-8 space-y-2 md:mb-10">
          <h3 className="section-title">How It Works</h3>
          <p className="max-w-2xl text-muted-foreground">Three focused steps for creating a respectful memorial experience.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((item, idx) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="surface-card p-5 md:p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step {idx + 1}</p>
                <div className="mb-4 inline-flex rounded-md bg-secondary p-2">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="mb-2 text-lg font-semibold">{item.title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="page-container py-12">
        <div className="surface-card flex flex-col items-start justify-between gap-5 p-6 md:flex-row md:items-center md:p-8">
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold">Ready to start building a memorial page?</h3>
            <p className="text-sm text-muted-foreground">Set up your first memorial page and publish when you are ready.</p>
          </div>
          <Button size="lg" asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
