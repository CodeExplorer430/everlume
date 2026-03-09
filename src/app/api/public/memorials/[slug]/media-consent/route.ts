import { createClient } from '@/lib/supabase/server'
import { canAccessMemorial } from '@/lib/server/page-access'
import {
  createMemorialMediaConsentToken,
  getMemorialMediaConsentCookieMaxAge,
  getMemorialMediaConsentCookieName,
  insertMemorialMediaConsent,
} from '@/lib/server/media-consent'
import { getE2EMemorialFixtureBySlug } from '@/lib/server/e2e-public-fixtures'
import { resolveMemorialAccessMode } from '@/lib/server/memorials'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({ slug: z.string().trim().min(1) })

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid memorial slug.' }, { status: 400 })
  }

  const fixture = getE2EMemorialFixtureBySlug(parsedParams.data.slug)
  if (fixture) {
    const access = await canAccessMemorial(fixture.memorial)
    if (!access.allowed) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Unlock the memorial before viewing protected media.' }, { status: 403 })
    }

    if (resolveMemorialAccessMode(fixture.memorial) === 'public') {
      return NextResponse.json({ code: 'CONSENT_NOT_REQUIRED', message: 'Protected media consent is not required for this memorial.' }, { status: 400 })
    }

    const response = NextResponse.json({ ok: true }, { status: 200 })
    response.cookies.set(
      getMemorialMediaConsentCookieName(fixture.memorial.id),
      createMemorialMediaConsentToken({
        memorialId: fixture.memorial.id,
        passwordUpdatedAt: fixture.memorial.password_updated_at || null,
        consentVersion: fixture.siteSettings?.protected_media_consent_version || 1,
        consentRevokedAt: fixture.memorial.media_consent_revoked_at || null,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: getMemorialMediaConsentCookieMaxAge(),
      }
    )
    return response
  }

  const supabase = await createClient()
  const { data: memorial } = await supabase
    .from('pages')
    .select('id, owner_id, slug, privacy, access_mode, password_updated_at, media_consent_revoked_at')
    .eq('slug', parsedParams.data.slug)
    .single()

  const { data: siteSettings } = await supabase
    .from('site_settings')
    .select('protected_media_consent_version')
    .eq('id', 1)
    .single()

  if (!memorial) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Memorial not found.' }, { status: 404 })
  }

  const access = await canAccessMemorial(memorial)
  if (!access.allowed) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Unlock the memorial before viewing protected media.' }, { status: 403 })
  }

  const accessMode = resolveMemorialAccessMode(memorial)
  if (accessMode === 'public') {
    return NextResponse.json({ code: 'CONSENT_NOT_REQUIRED', message: 'Protected media consent is not required for this memorial.' }, { status: 400 })
  }

  try {
    await insertMemorialMediaConsent({
      request,
      memorialId: memorial.id,
      accessMode,
      consentVersion: Number(siteSettings?.protected_media_consent_version) || 1,
      eventType: 'consent_granted',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to record media consent.'
    return NextResponse.json({ code: 'CONSENT_LOG_ERROR', message }, { status: 500 })
  }

  const response = NextResponse.json({ ok: true }, { status: 200 })
  response.cookies.set(
    getMemorialMediaConsentCookieName(memorial.id),
    createMemorialMediaConsentToken({
      memorialId: memorial.id,
      passwordUpdatedAt: memorial.password_updated_at || null,
      consentVersion: Number(siteSettings?.protected_media_consent_version) || 1,
      consentRevokedAt: memorial.media_consent_revoked_at || null,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: getMemorialMediaConsentCookieMaxAge(),
    }
  )
  return response
}
