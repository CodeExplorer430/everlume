import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const guestbookSchema = z.object({
  pageId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  message: z.string().trim().min(3).max(2000),
  honeypot: z.string().optional(),
  submittedAt: z.number().int().optional(),
  captchaToken: z.string().trim().optional(),
})

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000
const MIN_SUBMIT_DELAY_MS = 1_500

async function verifyCaptcha(token: string | undefined, ip: string) {
  const enabled = process.env.CAPTCHA_ENABLED === '1'
  if (!enabled) return true

  const secret = process.env.CAPTCHA_SECRET
  if (!secret || !token) return false

  const verifyUrl = process.env.CAPTCHA_VERIFY_URL || 'https://www.google.com/recaptcha/api/siteverify'
  const formData = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  })

  const response = await fetch(verifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
    cache: 'no-store',
  })

  if (!response.ok) return false
  const body = (await response.json()) as { success?: boolean }
  return body.success === true
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

  const { pageId, name, message, honeypot, submittedAt, captchaToken } = parsed.data

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
  const captchaOk = await verifyCaptcha(captchaToken, ip)
  if (!captchaOk) {
    return NextResponse.json(
      { code: 'CAPTCHA_FAILED', message: 'Captcha verification failed. Please try again.' },
      { status: 400 }
    )
  }

  const rateKey = `guestbook:${ip}:${pageId}`
  const rate = await checkRateLimit(rateKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  if (!rate.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMITED', message: 'Too many requests. Please try again in a minute.' },
      { status: 429 }
    )
  }

  const supabase = await createClient()

  const { data: page } = await supabase.from('pages').select('id').eq('id', pageId).single()
  if (!page) {
    return NextResponse.json({ code: 'PAGE_NOT_FOUND', message: 'Memorial page not found.' }, { status: 404 })
  }

  const { error } = await supabase.from('guestbook').insert({
    page_id: pageId,
    name,
    message,
  })

  if (error) {
    return NextResponse.json({ code: 'DATABASE_ERROR', message: 'Unable to submit your message right now.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
