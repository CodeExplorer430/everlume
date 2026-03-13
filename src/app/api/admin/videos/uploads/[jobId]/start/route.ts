import {
  assertMemorialOwnership,
  databaseError,
  forbidden,
  requireAdminUser,
} from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import {
  getVideoTranscodeApiBaseOrThrow,
  getVideoTranscodeApiTokenOrThrow,
  isVideoTranscodeConfigured,
} from '@/lib/server/video-upload'
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
    .select('id, page_id, status, cloud_job_id')
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

  if (job.status !== 'uploading' && job.status !== 'queued') {
    return NextResponse.json(
      {
        code: 'INVALID_STATE',
        message: 'Upload job is not ready to start processing.',
      },
      { status: 409 }
    )
  }

  if (!isVideoTranscodeConfigured()) {
    return NextResponse.json(
      {
        code: 'TRANSCODE_UNAVAILABLE',
        message:
          'Video transcode service is not configured. Use YouTube Unlisted for videos above 100MB.',
      },
      { status: 503 }
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(
      `${getVideoTranscodeApiBaseOrThrow()}/jobs/${job.cloud_job_id || job.id}/start`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getVideoTranscodeApiTokenOrThrow()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId: job.id }),
      }
    )
  } catch {
    return NextResponse.json(
      {
        code: 'TRANSCODE_UNAVAILABLE',
        message: 'Transcode service is unreachable.',
      },
      { status: 503 }
    )
  }

  const upstreamPayload = await upstream.json().catch(() => null)
  if (!upstream.ok) {
    return NextResponse.json(
      {
        code: 'TRANSCODE_START_FAILED',
        message:
          (upstreamPayload as { message?: string } | null)?.message ||
          'Unable to start transcode job.',
      },
      { status: 502 }
    )
  }

  const { error: updateError } = await supabase
    .from('video_upload_jobs')
    .update({ status: 'processing' })
    .eq('id', job.id)
  if (updateError) return databaseError('Unable to update upload job status.')

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'video.upload_start',
    entity: 'video_upload',
    entityId: job.id,
    metadata: { memorialId: job.page_id },
  })

  return NextResponse.json({ ok: true }, { status: 202 })
}
