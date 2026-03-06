import { databaseError, requireAdminUser } from '@/lib/server/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  homeDirectoryEnabled: z.boolean(),
})

export async function GET() {
  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const { data, error } = await supabase.from('site_settings').select('home_directory_enabled').eq('id', 1).single()
  if (error) {
    return databaseError('Unable to load site settings.')
  }

  return NextResponse.json(
    {
      settings: {
        homeDirectoryEnabled: data?.home_directory_enabled === true,
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
  const { supabase } = auth

  const { error } = await supabase
    .from('site_settings')
    .update({
      home_directory_enabled: parsed.data.homeDirectoryEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) {
    return databaseError('Unable to update site settings.')
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
