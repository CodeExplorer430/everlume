import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LegacyAdminEditRedirect({ params }: PageProps) {
  const { id } = await params
  redirect(`/admin/memorials/${id}`)
}
