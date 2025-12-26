import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('redirects')
    .select('target_url')
    .eq('shortcode', code)
    .single()

  if (data?.target_url) {
    redirect(data.target_url)
  }

  redirect('/')
}
