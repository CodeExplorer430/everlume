'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthFrame } from '@/components/pages/auth/AuthFrame'

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetPath, setResetPath] = useState<string | null>(null)
  const supabase = createClient()
  const useE2EFakeAuth = process.env.NEXT_PUBLIC_E2E_FAKE_AUTH === '1'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    setResetPath(null)

    if (useE2EFakeAuth) {
      const response = await fetch('/api/auth/e2e-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        setError(payload?.message || 'Unable to send reset email.')
        setLoading(false)
        return
      }

      const payload = (await response.json()) as { message?: string; resetPath?: string | null }
      setMessage(payload.message || 'Password reset instructions have been sent if the account exists.')
      setResetPath(payload.resetPath || null)
      setLoading(false)
      return
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=/login/reset-password`
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setMessage('Password reset instructions have been sent if the account exists.')
    setLoading(false)
  }

  return (
    <AuthFrame
      eyebrow="Password Recovery"
      title="Reset an admin password"
      description="Enter the email address for the admin account. Everlume will send a secure link to set a new password."
      form={
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="forgot-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {message && (
            <div className="space-y-2 rounded-2xl border border-emerald-300/70 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p>{message}</p>
              {resetPath && (
                <Link href={resetPath} className="inline-flex font-medium text-foreground underline underline-offset-4">
                  Continue to password reset
                </Link>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              <>
                <MailCheck className="h-4 w-4" />
                Send password reset
              </>
            )}
          </Button>
        </form>
      }
      footer={
        <p>
          Remembered your password?{' '}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Return to sign in
          </Link>
        </p>
      }
    />
  )
}
