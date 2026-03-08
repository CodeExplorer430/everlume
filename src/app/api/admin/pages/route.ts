import { databaseError, requireAdminUser } from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createPageSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,80}$/),
  fullName: z.string().trim().max(120).optional().default(''),
  dob: z.string().trim().nullable().optional(),
  dod: z.string().trim().nullable().optional(),
})

export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid request payload.' }, { status: 400 })
  }

  const parsed = createPageSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Please provide valid memorial details.' }, { status: 400 })
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId } = auth

  const { title, slug, fullName, dob, dod } = parsed.data
  const { data: siteSettings } = await supabase
    .from('site_settings')
    .select('memorial_slideshow_enabled, memorial_slideshow_interval_ms, memorial_video_layout')
    .eq('id', 1)
    .single()

  const { data, error } = await supabase
    .from('pages')
    .insert({
      title,
      slug,
      full_name: fullName || null,
      dob: dob || null,
      dod: dod || null,
      owner_id: userId,
      memorial_slideshow_enabled: siteSettings?.memorial_slideshow_enabled !== false,
      memorial_slideshow_interval_ms: Number(siteSettings?.memorial_slideshow_interval_ms) || 4500,
      memorial_video_layout: siteSettings?.memorial_video_layout === 'featured' ? 'featured' : 'grid',
    })
    .select('id, slug')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ code: 'SLUG_EXISTS', message: 'This URL slug is already in use.' }, { status: 409 })
    }
    return databaseError('Unable to create memorial page.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'page.create',
    entity: 'page',
    entityId: data.id,
    metadata: { slug: data.slug },
  })

  return NextResponse.json({ page: data }, { status: 201 })
}
