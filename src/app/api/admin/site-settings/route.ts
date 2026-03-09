import { databaseError, requireAdminUser } from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  homeDirectoryEnabled: z.boolean().optional(),
  memorialSlideshowEnabled: z.boolean().optional(),
  memorialSlideshowIntervalMs: z.number().int().min(2000).max(12000).optional(),
  memorialVideoLayout: z.enum(['grid', 'featured']).optional(),
  protectedMediaConsentTitle: z.string().trim().min(8).max(120).optional(),
  protectedMediaConsentBody: z.string().trim().min(20).max(800).optional(),
  bumpProtectedMediaConsentVersion: z.boolean().optional(),
}).refine((value) => Object.values(value).some((entry) => entry !== undefined), {
  message: 'Provide at least one site setting to update.',
})

export async function GET() {
  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const { data, error } = await supabase
    .from('site_settings')
    .select(
      'home_directory_enabled, memorial_slideshow_enabled, memorial_slideshow_interval_ms, memorial_video_layout, protected_media_consent_title, protected_media_consent_body, protected_media_consent_version'
    )
    .eq('id', 1)
    .single()
  if (error) {
    return databaseError('Unable to load site settings.')
  }

  return NextResponse.json(
    {
      settings: {
        homeDirectoryEnabled: data?.home_directory_enabled === true,
        memorialSlideshowEnabled: data?.memorial_slideshow_enabled !== false,
        memorialSlideshowIntervalMs: Number(data?.memorial_slideshow_interval_ms) || 4500,
        memorialVideoLayout: data?.memorial_video_layout === 'featured' ? 'featured' : 'grid',
        protectedMediaConsentTitle: data?.protected_media_consent_title || 'Media Viewing Notice',
        protectedMediaConsentBody:
          data?.protected_media_consent_body ||
          "The family has protected this memorial's photos and videos for respectful viewing. Continuing confirms that access to protected media is recorded for family oversight.",
        protectedMediaConsentVersion: Number(data?.protected_media_consent_version) || 1,
      },
    },
    { status: 200 }
  )
}

export async function PATCH(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid request payload.' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid site settings payload.' }, { status: 400 })
  }

  const auth = await requireAdminUser({ minRole: 'admin' })
  if (!auth.ok) return auth.response
  const { supabase, userId } = auth

  const { data: existing, error: existingError } = await supabase
    .from('site_settings')
    .select(
      'home_directory_enabled, memorial_slideshow_enabled, memorial_slideshow_interval_ms, memorial_video_layout, protected_media_consent_title, protected_media_consent_body, protected_media_consent_version'
    )
    .eq('id', 1)
    .single()
  if (existingError) {
    return databaseError('Unable to load current site settings.')
  }

  const updatePayload: Record<string, boolean | number | string> = {
    updated_at: new Date().toISOString(),
  }

  if (parsed.data.homeDirectoryEnabled !== undefined) {
    updatePayload.home_directory_enabled = parsed.data.homeDirectoryEnabled
  }
  if (parsed.data.memorialSlideshowEnabled !== undefined) {
    updatePayload.memorial_slideshow_enabled = parsed.data.memorialSlideshowEnabled
  }
  if (parsed.data.memorialSlideshowIntervalMs !== undefined) {
    updatePayload.memorial_slideshow_interval_ms = parsed.data.memorialSlideshowIntervalMs
  }
  if (parsed.data.memorialVideoLayout !== undefined) {
    updatePayload.memorial_video_layout = parsed.data.memorialVideoLayout
  }
  if (parsed.data.protectedMediaConsentTitle !== undefined) {
    updatePayload.protected_media_consent_title = parsed.data.protectedMediaConsentTitle
  }
  if (parsed.data.protectedMediaConsentBody !== undefined) {
    updatePayload.protected_media_consent_body = parsed.data.protectedMediaConsentBody
  }

  const consentCopyChanged =
    parsed.data.protectedMediaConsentTitle !== undefined ||
    parsed.data.protectedMediaConsentBody !== undefined

  if (consentCopyChanged || parsed.data.bumpProtectedMediaConsentVersion === true) {
    updatePayload.protected_media_consent_version = (Number(existing?.protected_media_consent_version) || 1) + 1
  }

  const { error } = await supabase
    .from('site_settings')
    .update(updatePayload)
    .eq('id', 1)

  if (error) {
    return databaseError('Unable to update site settings.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'site_settings.update',
    entity: 'site_settings',
    entityId: '1',
    metadata: {
      before: {
        homeDirectoryEnabled: existing?.home_directory_enabled === true,
        memorialSlideshowEnabled: existing?.memorial_slideshow_enabled !== false,
        memorialSlideshowIntervalMs: Number(existing?.memorial_slideshow_interval_ms) || 4500,
        memorialVideoLayout: existing?.memorial_video_layout === 'featured' ? 'featured' : 'grid',
        protectedMediaConsentTitle: existing?.protected_media_consent_title || 'Media Viewing Notice',
        protectedMediaConsentBody:
          existing?.protected_media_consent_body ||
          "The family has protected this memorial's photos and videos for respectful viewing. Continuing confirms that access to protected media is recorded for family oversight.",
        protectedMediaConsentVersion: Number(existing?.protected_media_consent_version) || 1,
      },
      after: {
        homeDirectoryEnabled:
          parsed.data.homeDirectoryEnabled !== undefined
            ? parsed.data.homeDirectoryEnabled
            : existing?.home_directory_enabled === true,
        memorialSlideshowEnabled:
          parsed.data.memorialSlideshowEnabled !== undefined
            ? parsed.data.memorialSlideshowEnabled
            : existing?.memorial_slideshow_enabled !== false,
        memorialSlideshowIntervalMs:
          parsed.data.memorialSlideshowIntervalMs !== undefined
            ? parsed.data.memorialSlideshowIntervalMs
            : Number(existing?.memorial_slideshow_interval_ms) || 4500,
        memorialVideoLayout:
          parsed.data.memorialVideoLayout !== undefined
            ? parsed.data.memorialVideoLayout
            : existing?.memorial_video_layout === 'featured'
              ? 'featured'
              : 'grid',
        protectedMediaConsentTitle:
          parsed.data.protectedMediaConsentTitle !== undefined
            ? parsed.data.protectedMediaConsentTitle
            : existing?.protected_media_consent_title || 'Media Viewing Notice',
        protectedMediaConsentBody:
          parsed.data.protectedMediaConsentBody !== undefined
            ? parsed.data.protectedMediaConsentBody
            : existing?.protected_media_consent_body ||
              "The family has protected this memorial's photos and videos for respectful viewing. Continuing confirms that access to protected media is recorded for family oversight.",
        protectedMediaConsentVersion:
          consentCopyChanged || parsed.data.bumpProtectedMediaConsentVersion === true
            ? (Number(existing?.protected_media_consent_version) || 1) + 1
            : Number(existing?.protected_media_consent_version) || 1,
      },
    },
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
