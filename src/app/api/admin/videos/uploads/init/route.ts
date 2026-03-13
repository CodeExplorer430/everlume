import {
  assertMemorialOwnership,
  databaseError,
  forbidden,
  requireAdminUser,
} from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { resolveMemorialId } from '@/lib/server/memorials'
import {
  getVideoTranscodeApiBaseOrThrow,
  getVideoTranscodeApiTokenOrThrow,
  isVideoTranscodeConfigured,
} from '@/lib/server/video-upload'
import { validateAdminMutationOrigin } from '@/lib/security/request-origin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const initSchema = z
  .object({
    memorialId: z.string().uuid().optional(),
    pageId: z.string().uuid().optional(),
    fileName: z.string().trim().min(1).max(200),
    fileSize: z
      .number()
      .int()
      .positive()
      .max(1024 * 1024 * 1024),
    mimeType: z.string().trim().min(1).max(100),
    title: z.string().trim().max(120).optional().default(''),
  })
  .refine((value) => Boolean(resolveMemorialId(value)), {
    message: 'Memorial id is required.',
  })

const transcodeInitResponseSchema = z.object({
  cloudJobId: z.string().trim().min(1).optional(),
  uploadUrl: z.string().url(),
  uploadMethod: z.string().trim().min(3).max(10).optional(),
})

export async function POST(request: NextRequest) {
  const originError = validateAdminMutationOrigin(request)
  if (originError) return originError

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', message: 'Invalid request payload.' },
      { status: 400 }
    )
  }

  const parsed = initSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'VALIDATION_ERROR',
        message:
          'Provide a valid memorial id, filename, mime type, and file size.',
      },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const { fileName, fileSize, mimeType, title } = parsed.data
  const memorialId = resolveMemorialId(parsed.data)!
  const ownsMemorial = await assertMemorialOwnership(
    supabase,
    memorialId,
    userId,
    role
  )
  if (!ownsMemorial)
    return forbidden('You do not have access to this memorial.')

  const { data: job, error: jobError } = await supabase
    .from('video_upload_jobs')
    .insert({
      page_id: memorialId,
      created_by: userId,
      status: 'queued',
      title: title || null,
      source_filename: fileName,
      source_mime: mimeType,
      source_bytes: fileSize,
    })
    .select(
      'id, page_id, created_by, status, title, source_filename, source_mime, source_bytes, created_at, updated_at'
    )
    .single()

  if (jobError || !job) {
    return databaseError('Unable to create upload job.')
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

  const origin = request.nextUrl?.origin || new URL(request.url).origin
  const callbackUrl = `${origin}/api/internal/video-transcode/callback`

  let upstream: Response
  try {
    upstream = await fetch(`${getVideoTranscodeApiBaseOrThrow()}/jobs/init`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getVideoTranscodeApiTokenOrThrow()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: job.id,
        memorialId,
        pageId: memorialId,
        fileName,
        fileSize,
        mimeType,
        callbackUrl,
      }),
    })
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
        code: 'TRANSCODE_INIT_FAILED',
        message:
          (upstreamPayload as { message?: string } | null)?.message ||
          'Unable to initialize video upload.',
      },
      { status: 502 }
    )
  }

  const transcodeInit = transcodeInitResponseSchema.safeParse(upstreamPayload)
  if (!transcodeInit.success) {
    return NextResponse.json(
      {
        code: 'TRANSCODE_INVALID_RESPONSE',
        message: 'Invalid transcode service response.',
      },
      { status: 502 }
    )
  }

  const { data: updated, error: updateError } = await supabase
    .from('video_upload_jobs')
    .update({
      status: 'uploading',
      upload_url: transcodeInit.data.uploadUrl,
      upload_method: transcodeInit.data.uploadMethod || 'PUT',
      cloud_job_id: transcodeInit.data.cloudJobId || null,
    })
    .eq('id', job.id)
    .select('id, status, upload_url, upload_method')
    .single()

  if (updateError || !updated) {
    return databaseError('Unable to update upload job.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'video.upload_init',
    entity: 'video_upload',
    entityId: job.id,
    metadata: { memorialId, fileSize, mimeType },
  })

  return NextResponse.json(
    {
      job: {
        id: job.id,
        status: updated.status,
        uploadUrl: updated.upload_url,
        uploadMethod: updated.upload_method || 'PUT',
      },
    },
    { status: 201 }
  )
}
