import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const e2eBypass = process.env.E2E_BYPASS_ADMIN_AUTH === '1'

  if (e2eBypass) {
    return <AdminShell userEmail={process.env.E2E_ADMIN_EMAIL || 'e2e-admin@everlume.local'}>{children}</AdminShell>
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <AdminShell userEmail={user.email}>{children}</AdminShell>
}
