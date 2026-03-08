'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { HeartHandshake, Shield, Sparkles } from 'lucide-react'

interface AuthFrameProps {
  eyebrow: string
  title: string
  description: string
  form: ReactNode
  footer?: ReactNode
  sideNote?: ReactNode
}

const trustPoints = [
  'Individual admin accounts with role-based access',
  'Secure password setup and recovery through Supabase Auth',
  'A private operations space for memorial moderation',
]

export function AuthFrame({ eyebrow, title, description, form, footer, sideNote }: AuthFrameProps) {
  return (
    <main id="main-content" className="min-h-screen px-4 py-8 md:py-12">
      <div className="page-container grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:items-stretch">
        <section className="auth-showcase surface-card hidden overflow-hidden p-8 lg:block">
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Secure family admin access
              </p>
              <div className="space-y-4">
                <div className="inline-flex rounded-2xl border border-white/40 bg-white/70 p-3 shadow-[0_18px_40px_rgba(45,56,41,0.14)]">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                </div>
                <h1 className="max-w-md text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-foreground">
                  Steward memory with care, clarity, and privacy.
                </h1>
                <p className="max-w-md text-base leading-relaxed text-muted-foreground">
                  Everlume gives each family collaborator their own account so publishing, moderation, and memorial upkeep stay secure and accountable.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {trustPoints.map((point) => (
                <div key={point} className="rounded-2xl border border-border/75 bg-white/72 px-4 py-3 text-sm text-foreground shadow-[0_10px_24px_rgba(39,49,39,0.08)]">
                  {point}
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(246,242,232,0.88))] p-5">
              <p className="text-sm font-medium text-foreground">Professional memorial operations</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Use separate passwords for each admin account. Invite collaborators by email and rotate credentials without disrupting the rest of the team.
              </p>
              {sideNote && <div className="mt-4 text-sm text-muted-foreground">{sideNote}</div>}
            </div>
          </div>
        </section>

        <section className="surface-card auth-panel p-6 sm:p-8 md:p-10">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-border/75 bg-[var(--surface-1)] px-3 py-2 text-sm font-medium text-foreground">
              <span className="rounded-full bg-primary/15 p-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </span>
              Everlume
            </Link>
            <Link href="/" className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Back to homepage
            </Link>
          </div>

          <div className="mb-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          {form}

          {footer && <div className="mt-6 border-t border-border/70 pt-5 text-sm text-muted-foreground">{footer}</div>}
        </section>
      </div>
    </main>
  )
}
