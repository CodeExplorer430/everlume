import { assertPageOwnership, databaseError, forbidden, getOwnedPage, requireAdminUser } from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { hashPagePassword } from '@/lib/server/page-password'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const pageUpdateSchema = z
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
    qrTemplate: z.enum(['classic', 'minimal', 'warm']).optional(),
    qrCaption: z.string().trim().min(2).max(40).optional(),
  })
  .refine((value) => value.accessMode !== 'password' || Boolean(value.password), {
    message: 'Password is required when access mode is password.',
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No fields to update.' })

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid page id.' }, { status: 400 })
  }

  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const pageId = parsedParams.data.id
  const page = await getOwnedPage(supabase, pageId, userId, role)
  const error = !page

  if (error || !page) return forbidden('You do not have access to this page.')

  return NextResponse.json({ page }, { status: 200 })
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid page id.' }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid request payload.' }, { status: 400 })
  }

  const parsedPayload = pageUpdateSchema.safeParse(payload)
  if (!parsedPayload.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Please check page details and try again.' }, { status: 400 })
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const pageId = parsedParams.data.id
  const ownsPage = await assertPageOwnership(supabase, pageId, userId, role)
  if (!ownsPage) return forbidden('You do not have access to this page.')

  const body = parsedPayload.data
  const updatePayload = {
    title: body.title,
    slug: body.slug,
    full_name: body.fullName,
    dob: body.dob,
    dod: body.dod,
    access_mode: body.accessMode,
    privacy:
      body.accessMode === 'public'
        ? 'public'
        : body.accessMode === 'private' || body.accessMode === 'password'
          ? 'private'
          : undefined,
    password_hash: body.password ? hashPagePassword(body.password) : undefined,
    password_updated_at: body.password ? new Date().toISOString() : undefined,
    hero_image_url: body.heroImageUrl,
    memorial_theme: body.memorialTheme,
    memorial_slideshow_enabled: body.memorialSlideshowEnabled,
    memorial_slideshow_interval_ms: body.memorialSlideshowIntervalMs,
    memorial_video_layout: body.memorialVideoLayout,
    qr_template: body.qrTemplate,
    qr_caption: body.qrCaption,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('pages').update(updatePayload).eq('id', pageId)
  if (error) {
    return databaseError('Unable to update page.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'page.update',
    entity: 'page',
    entityId: pageId,
    metadata: { fields: Object.keys(parsedPayload.data) },
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
