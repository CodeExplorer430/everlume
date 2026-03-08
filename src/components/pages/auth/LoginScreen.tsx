'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Loader2, Mail, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthFrame } from '@/components/pages/auth/AuthFrame'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const useE2EFakeAuth = process.env.NEXT_PUBLIC_E2E_FAKE_AUTH === '1'

  const bannerMessage = useMemo(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) return decodeURIComponent(errorParam)
    if (searchParams.get('reset') === 'success') return 'Password updated. Sign in with your new password.'
    return null
  }, [searchParams])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    if (useE2EFakeAuth) {
      const response = await fetch('/api/auth/e2e-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        setError(payload?.message || 'Unable to sign in.')
        setLoading(false)
        return
      }

      router.push('/admin')
      router.refresh()
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <AuthFrame
      eyebrow="Admin Sign In"
      title="Welcome back to Everlume Admin"
      description="Use your individual admin account to manage memorials, moderate tributes, and maintain short-link access without sharing one family login."
      sideNote={
        <p className="leading-relaxed">
          Invited admins receive their own setup email. Existing admins can request a password reset at any time.
        </p>
      }
      form={
        <form className="space-y-4" onSubmit={handleLogin}>
          {bannerMessage && (
            <div className="rounded-2xl border border-emerald-300/70 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {bannerMessage}
            </div>
          )}

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
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Link href="/login/forgot-password" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>
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

          {error && (
            <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in to Admin
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      }
      footer={
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <span>Invite-only admin access</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <span>Individual passwords per account</span>
          </div>
        </div>
      }
    />
  )
}
