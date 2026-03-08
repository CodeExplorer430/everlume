import { LandingContent } from '@/components/pages/public/HomeLanding'
import { resolveMemorialAccessMode } from '@/lib/server/memorials'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'

type HomeMemorial = {
  id: string
  title: string
  slug: string
  full_name: string | null
  privacy?: 'public' | 'private' | null
  access_mode?: 'public' | 'private' | 'password' | null
}

const getHomeDirectoryEnabled = unstable_cache(
  async () => {
    const supabase = createPublicClient()
    const { data, error } = await supabase.from('site_settings').select('home_directory_enabled').eq('id', 1).single()
    if (error) return false
    return data?.home_directory_enabled === true
  },
  ['home:directory-enabled'],
  { revalidate: 120 }
)

const getPublicMemorialDirectory = unstable_cache(
  async () => {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('pages')
      .select('id, title, slug, full_name, privacy, access_mode')
      .order('created_at', { ascending: false })
      .limit(24)
    if (error) return [] as HomeMemorial[]
    return ((data || []) as HomeMemorial[]).filter((memorial) => resolveMemorialAccessMode(memorial) === 'public')
  },
  ['home:public-memorial-directory'],
  { revalidate: 120 }
)

export default async function Home() {
  const directoryEnabled = await getHomeDirectoryEnabled()
  const memorials = directoryEnabled ? await getPublicMemorialDirectory() : []

  return <LandingContent directoryEnabled={directoryEnabled} memorials={memorials} />
}
