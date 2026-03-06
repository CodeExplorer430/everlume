import { LandingContent } from '@/components/pages/public/HomeLanding'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  let directoryEnabled = false

  try {
    const { data: siteSettings } = await supabase.from('site_settings').select('home_directory_enabled').eq('id', 1).single()
    directoryEnabled = siteSettings?.home_directory_enabled === true
  } catch {
    directoryEnabled = false
  }

  let memorials: { id: string; title: string; slug: string; full_name: string | null }[] = []
  if (directoryEnabled) {
    try {
      const result = await supabase
        .from('pages')
        .select('id, title, slug, full_name')
        .eq('privacy', 'public')
        .order('created_at', { ascending: false })
        .limit(24)
      memorials = result.data || []
    } catch {
      memorials = []
    }
  }

  return <LandingContent directoryEnabled={directoryEnabled} memorials={memorials} />
}
