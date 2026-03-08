import { assertMemorialOwnership, databaseError, forbidden, requireAdminUser } from '@/lib/server/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({
  jobId: z.string().uuid(),
})

export async function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid upload job id.' }, { status: 400 })
  }

  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const { data: job, error } = await supabase
    .from('video_upload_jobs')
    .select(
      'id, page_id, status, title, source_filename, source_mime, source_bytes, output_public_id, output_url, output_bytes, error_message, created_at, updated_at'
    )
    .eq('id', parsed.data.jobId)
    .single()

  if (error || !job) {
    return databaseError('Unable to load upload job.')
  }

  const ownsMemorial = await assertMemorialOwnership(supabase, job.page_id, userId, role)
  if (!ownsMemorial) return forbidden('You do not have access to this upload job.')

  return NextResponse.json({ job }, { status: 200 })
}
