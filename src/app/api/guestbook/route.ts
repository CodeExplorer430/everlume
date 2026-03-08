import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'
import { resolveMemorialId } from '@/lib/server/memorials'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const guestbookSchema = z.object({
  memorialId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  message: z.string().trim().min(3).max(2000),
  honeypot: z.string().optional(),
  submittedAt: z.number().int().optional(),
  captchaToken: z.string().trim().optional(),
}).refine((value) => Boolean(resolveMemorialId(value)), {
  message: 'Memorial id is required.',
})

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000
const MIN_SUBMIT_DELAY_MS = 1_500
const DEFAULT_TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

type CaptchaCheckResult = {
  ok: boolean
  code?: 'MISSING_INPUT' | 'UPSTREAM_ERROR' | 'INVALID_RESPONSE' | 'FAILED'
}

async function verifyCaptcha(token: string | undefined, ip: string): Promise<CaptchaCheckResult> {
  const enabled = process.env.CAPTCHA_ENABLED === '1'
  if (!enabled) return { ok: true }

  const secret = process.env.CAPTCHA_SECRET
  if (!secret || !token) return { ok: false, code: 'MISSING_INPUT' }

  const verifyUrl = process.env.CAPTCHA_VERIFY_URL?.trim() || DEFAULT_TURNSTILE_VERIFY_URL
  const formData = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  })

  let response: Response
  try {
    response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, code: 'UPSTREAM_ERROR' }
  }

  if (!response.ok) return { ok: false, code: 'UPSTREAM_ERROR' }

  let body: { success?: boolean } | null = null
  try {
    body = (await response.json()) as { success?: boolean }
  } catch {
    return { ok: false, code: 'INVALID_RESPONSE' }
  }

  if (body?.success === true) return { ok: true }
  return { ok: false, code: 'FAILED' }
}

function getGuestbookSecurityConfigIssue() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  if (!isProduction) return null

  if (process.env.RATE_LIMIT_BACKEND !== 'upstash') {
    return 'Guestbook is unavailable until durable rate limiting is configured.'
  }

  if (process.env.CAPTCHA_ENABLED !== '1' || !process.env.CAPTCHA_SECRET) {
    return 'Guestbook is unavailable until CAPTCHA protection is configured.'
  }

  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY.trim().length === 0) {
    return 'Guestbook is unavailable until CAPTCHA protection is configured.'
  }

  return null
}

export async function POST(request: NextRequest) {
  const securityIssue = getGuestbookSecurityConfigIssue()
  if (securityIssue) {
    return NextResponse.json({ code: 'CONFIGURATION_ERROR', message: securityIssue }, { status: 503 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid request payload.' }, { status: 400 })
  }

  const parsed = guestbookSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Please check the form fields and try again.' },
      { status: 400 }
    )
  }

  const { name, message, honeypot, submittedAt, captchaToken } = parsed.data
  const memorialId = resolveMemorialId(parsed.data)
  if (!memorialId) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Memorial id is required.' }, { status: 400 })
  }

  if (honeypot && honeypot.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 202 })
  }

  if (submittedAt && Date.now() - submittedAt < MIN_SUBMIT_DELAY_MS) {
    return NextResponse.json(
      { code: 'TOO_FAST', message: 'Please wait a moment before submitting your message.' },
      { status: 429 }
    )
  }

  const ip = getClientIp(request.headers.get('x-forwarded-for'))
  const captcha = await verifyCaptcha(captchaToken, ip)
  if (!captcha.ok) {
    const failureMessage =
      captcha.code === 'MISSING_INPUT'
        ? 'Please complete the captcha check before posting.'
        : captcha.code === 'UPSTREAM_ERROR' || captcha.code === 'INVALID_RESPONSE'
          ? 'Spam protection is temporarily unavailable. Please try again shortly.'
          : 'Captcha verification failed. Please try again.'

    return NextResponse.json(
      { code: 'CAPTCHA_FAILED', message: failureMessage },
      { status: 400 }
    )
  }

  const rateKey = `guestbook:${ip}:${memorialId}`
  const rate = await checkRateLimit(rateKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  if (!rate.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMITED', message: 'Too many requests. Please try again in a minute.' },
      { status: 429 }
    )
  }

  const supabase = await createClient()

  const { data: memorial } = await supabase.from('pages').select('id').eq('id', memorialId).single()
  if (!memorial) {
    return NextResponse.json({ code: 'MEMORIAL_NOT_FOUND', message: 'Memorial not found.' }, { status: 404 })
  }

  const { error } = await supabase.from('guestbook').insert({
    page_id: memorialId,
    name,
    message,
  })

  if (error) {
    return NextResponse.json({ code: 'DATABASE_ERROR', message: 'Unable to submit your message right now.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
