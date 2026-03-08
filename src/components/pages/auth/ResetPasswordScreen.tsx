'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthFrame } from '@/components/pages/auth/AuthFrame'

export function ResetPasswordScreen() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const useE2EFakeAuth = process.env.NEXT_PUBLIC_E2E_FAKE_AUTH === '1'
  const resetEmail = searchParams.get('email')

  const passwordMismatch = useMemo(() => confirmPassword.length > 0 && password !== confirmPassword, [confirmPassword, password])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (passwordMismatch) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    if (useE2EFakeAuth) {
      const response = await fetch('/api/auth/e2e-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', email: resetEmail, password }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        setError(payload?.message || 'Unable to update password.')
        setLoading(false)
        return
      }

      setMessage('Password updated. Redirecting to sign in...')
      setLoading(false)

      window.setTimeout(() => {
        router.push('/login?reset=success')
        router.refresh()
      }, 900)
      return
    }

    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setMessage('Password updated. Redirecting to sign in...')
    setLoading(false)

    window.setTimeout(() => {
      router.push('/login?reset=success')
      router.refresh()
    }, 900)
  }

  return (
    <AuthFrame
      eyebrow="Set New Password"
      title="Choose a fresh password"
      description="This password belongs to your individual Everlume admin account. Use a strong password that is not shared with other family collaborators."
      form={
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-sm font-medium">
              New Password
            </label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="Enter a strong password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="Repeat the new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {passwordMismatch && (
            <div role="alert" className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Passwords do not match.
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {useE2EFakeAuth && !resetEmail && (
            <div role="alert" className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Reset link is incomplete. Start from the forgot-password screen.
            </div>
          )}

          {message && (
            <div className="rounded-2xl border border-emerald-300/70 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {message}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading || password.length < 8 || passwordMismatch || (useE2EFakeAuth && !resetEmail)}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving password...
              </>
            ) : (
              <>
                <LockKeyhole className="h-4 w-4" />
                Update password
              </>
            )}
          </Button>
        </form>
      }
      footer={
        <div className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>Use at least 8 characters and keep the account private to the assigned admin.</span>
        </div>
      }
    />
  )
}
