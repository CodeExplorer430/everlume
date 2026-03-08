import { EditMemorialScreen } from '@/components/pages/admin/EditMemorialScreen'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditTributePage({ params }: PageProps) {
  const { id } = await params
  return <EditMemorialScreen pageId={id} />
}
