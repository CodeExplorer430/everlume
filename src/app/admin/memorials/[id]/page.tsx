'use client'

import { use } from 'react'
import { EditMemorialScreen } from '@/components/pages/admin/EditMemorialScreen'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditTributePage({ params }: PageProps) {
  const { id } = use(params)
  return <EditMemorialScreen pageId={id} />
}
