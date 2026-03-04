'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HeartHandshake, Shield } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="page-container grid gap-6 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-stretch">
        <section className="surface-card hidden p-8 md:block">
          <div className="flex h-full flex-col justify-between">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Secure family admin access
              </p>
              <h1 className="section-title max-w-sm">Welcome back to Everlume Admin</h1>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Sign in to manage memorial pages, publish new memories, moderate messages, and generate short-link QR codes for plaques.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-[var(--surface-1)] p-4 text-sm text-muted-foreground">
              Keep credentials private and use a strong password for shared family accounts.
            </div>
          </div>
        </section>

        <section className="surface-card p-6 sm:p-8 md:p-10">
          <div className="mb-6 flex items-center gap-2">
            <div className="rounded-full bg-primary/30 p-2">
              <HeartHandshake className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium">Everlume</p>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use your admin account to continue.</p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-1.5">
              <label htmlFor="email-address" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

            <Button type="submit" className="mt-1 w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in to Admin'}
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            Need to return to the homepage?{' '}
            <Link href="/" className="font-medium text-foreground underline underline-offset-2">
              Go back
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
