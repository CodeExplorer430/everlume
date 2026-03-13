import {
  assertMemorialOwnership,
  databaseError,
  forbidden,
  requireAdminUser,
} from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { validateAdminMutationOrigin } from '@/lib/security/request-origin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({
  jobId: z.string().uuid(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const originError = validateAdminMutationOrigin(request)
  if (originError) return originError

  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid upload job id.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const { data: job, error } = await supabase
    .from('video_upload_jobs')
    .select('id, page_id, status, title, output_public_id')
    .eq('id', parsed.data.jobId)
    .single()

  if (error || !job) {
    return databaseError('Unable to load upload job.')
  }

  const ownsMemorial = await assertMemorialOwnership(
    supabase,
    job.page_id,
    userId,
    role
  )
  if (!ownsMemorial)
    return forbidden('You do not have access to this upload job.')

  if (job.status !== 'completed') {
    return NextResponse.json(
      { code: 'INVALID_STATE', message: 'Video is not ready to attach.' },
      { status: 409 }
    )
  }

  if (!job.output_public_id) {
    return NextResponse.json(
      { code: 'MISSING_OUTPUT', message: 'Compressed output is missing.' },
      { status: 409 }
    )
  }

  const { data: video, error: insertError } = await supabase
    .from('videos')
    .insert({
      page_id: job.page_id,
      provider: 'cloudinary',
      provider_id: job.output_public_id,
      title: job.title || null,
    })
    .select('id, provider, provider_id, title, created_at')
    .single()

  if (insertError || !video) {
    return databaseError('Unable to attach compressed video.')
  }

  const { error: updateError } = await supabase
    .from('video_upload_jobs')
    .update({ status: 'attached' })
    .eq('id', job.id)
  if (updateError) return databaseError('Unable to update upload job status.')

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'video.upload_attach',
    entity: 'video_upload',
    entityId: job.id,
    metadata: {
      memorialId: job.page_id,
      videoId: video.id,
      providerId: job.output_public_id,
    },
  })

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'video.create',
    entity: 'video',
    entityId: video.id,
    metadata: {
      memorialId: job.page_id,
      provider: 'cloudinary',
      providerId: job.output_public_id,
    },
  })

  return NextResponse.json({ video }, { status: 201 })
}
