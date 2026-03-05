import { createClient } from '@/lib/supabase/server'
import { AdminDashboardView } from '@/components/pages/admin/AdminDashboardView'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: pages } = await supabase.from('pages').select('*').order('created_at', { ascending: false })

  return <AdminDashboardView pages={pages || []} />
}
