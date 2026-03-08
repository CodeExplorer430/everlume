import { createClient } from '@/lib/supabase/server'
import { isE2EFakeAuthEnabled } from '@/lib/server/e2e-auth'
import { AdminDashboardView } from '@/components/pages/admin/AdminDashboardView'

export default async function AdminDashboard() {
  if (isE2EFakeAuthEnabled()) {
    return <AdminDashboardView pages={[]} />
  }

  const supabase = await createClient()
  const { data: pages } = await supabase.from('pages').select('*').order('created_at', { ascending: false })

  return <AdminDashboardView pages={pages || []} />
}
