import { redirect } from 'next/navigation'

export default function LegacyAdminNewRedirect() {
  redirect('/admin/memorials/new')
}
