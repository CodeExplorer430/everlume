import { assertMemorialOwnership, databaseError, forbidden, getOwnedMemorial, requireAdminUser } from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { persistLegacyMemorialPrivacy, toMemorialRecord } from '@/lib/server/memorials'
import { hashMemorialPassword } from '@/lib/server/page-password'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const memorialUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,80}$/).optional(),
    fullName: z.string().trim().max(120).nullable().optional(),
    dob: z.string().nullable().optional(),
    dod: z.string().nullable().optional(),
    accessMode: z.enum(['public', 'private', 'password']).optional(),
    password: z.string().min(6).max(128).optional(),
    heroImageUrl: z.string().trim().url().nullable().optional(),
    memorialTheme: z.enum(['classic', 'serene', 'editorial']).optional(),
    memorialSlideshowEnabled: z.boolean().optional(),
    memorialSlideshowIntervalMs: z.number().int().min(2000).max(12000).optional(),
    memorialVideoLayout: z.enum(['grid', 'featured']).optional(),
    memorialPhotoFit: z.enum(['cover', 'contain']).optional(),
    memorialCaptionStyle: z.enum(['classic', 'minimal']).optional(),
    qrTemplate: z.enum(['classic', 'minimal', 'warm']).optional(),
    qrCaption: z.string().trim().min(2).max(40).optional(),
    qrForegroundColor: z.enum(['#111827', '#14532d', '#7c2d12']).optional(),
    qrBackgroundColor: z.enum(['#ffffff', '#f8fafc', '#fffaf2']).optional(),
    qrFrameStyle: z.enum(['line', 'rounded', 'double']).optional(),
    qrCaptionFont: z.enum(['serif', 'sans']).optional(),
    qrShowLogo: z.boolean().optional(),
  })
  .refine((value) => value.accessMode !== 'password' || Boolean(value.password), {
    message: 'Password is required when access mode is password.',
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No fields to update.' })

const memorialSelect =
  'id, title, slug, full_name, dob, dod, privacy, access_mode, hero_image_url, memorial_theme, memorial_slideshow_enabled, memorial_slideshow_interval_ms, memorial_video_layout, memorial_photo_fit, memorial_caption_style, qr_template, qr_caption, qr_foreground_color, qr_background_color, qr_frame_style, qr_caption_font, qr_show_logo'

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid memorial id.' }, { status: 400 })
  }

  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const memorialId = parsedParams.data.id
  const memorial = await getOwnedMemorial(supabase, memorialId, userId, role)
  if (!memorial) return forbidden('You do not have access to this memorial.')

  return NextResponse.json({ memorial }, { status: 200 })
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid memorial id.' }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid request payload.' }, { status: 400 })
  }

  const parsedPayload = memorialUpdateSchema.safeParse(payload)
  if (!parsedPayload.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Please check memorial details and try again.' }, { status: 400 })
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const memorialId = parsedParams.data.id
  const ownsMemorial = await assertMemorialOwnership(supabase, memorialId, userId, role)
  if (!ownsMemorial) return forbidden('You do not have access to this memorial.')

  const body = parsedPayload.data
  const updatePayload = {
    title: body.title,
    slug: body.slug,
    full_name: body.fullName,
    dob: body.dob,
    dod: body.dod,
    access_mode: body.accessMode,
    privacy: persistLegacyMemorialPrivacy(body.accessMode),
    password_hash: body.password ? hashMemorialPassword(body.password) : undefined,
    password_updated_at: body.password ? new Date().toISOString() : undefined,
    hero_image_url: body.heroImageUrl,
    memorial_theme: body.memorialTheme,
    memorial_slideshow_enabled: body.memorialSlideshowEnabled,
    memorial_slideshow_interval_ms: body.memorialSlideshowIntervalMs,
    memorial_video_layout: body.memorialVideoLayout,
    memorial_photo_fit: body.memorialPhotoFit,
    memorial_caption_style: body.memorialCaptionStyle,
    qr_template: body.qrTemplate,
    qr_caption: body.qrCaption,
    qr_foreground_color: body.qrForegroundColor,
    qr_background_color: body.qrBackgroundColor,
    qr_frame_style: body.qrFrameStyle,
    qr_caption_font: body.qrCaptionFont,
    qr_show_logo: body.qrShowLogo,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('pages').update(updatePayload).eq('id', memorialId).select(memorialSelect).single()
  if (error || !data) {
    return databaseError('Unable to update memorial.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'memorial.update',
    entity: 'memorial',
    entityId: memorialId,
    metadata: { fields: Object.keys(parsedPayload.data) },
  })

  return NextResponse.json({ memorial: toMemorialRecord(data) }, { status: 200 })
}
