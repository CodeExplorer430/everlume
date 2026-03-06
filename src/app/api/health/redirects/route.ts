import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function checkWorkerReachability() {
  const shortDomain = process.env.NEXT_PUBLIC_SHORT_DOMAIN
  if (!shortDomain) return false

  try {
    const url = new URL('/__health', shortDomain)
    const response = await fetch(url.toString(), {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
    })
    return response.status >= 200 && response.status < 500
  } catch {
    return false
  }
}

export async function GET() {
  const supabase = await createClient()
  const { error } = await supabase.from('redirects').select('id', { head: true, count: 'exact' }).limit(1)

  const dbOk = !error
  const workerReachable = await checkWorkerReachability()

  return NextResponse.json(
    {
      ok: dbOk,
      checkedAt: new Date().toISOString(),
      workerReachable,
    },
    {
      status: dbOk ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
