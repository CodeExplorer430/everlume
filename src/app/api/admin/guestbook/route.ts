import { databaseError, requireAdminUser } from '@/lib/server/admin-auth'
import { NextResponse } from 'next/server'

type GuestbookRow = {
  id: string
  name: string
  message: string
  is_approved: boolean
  created_at: string
  page_id: string
}

function isSchemaMismatch(error: { code?: string } | null) {
  return error?.code === '42703' || error?.code === '42P01'
}

export async function GET() {
  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  let pagesQuery = supabase.from('pages').select('id, title')
  if (role !== 'admin') {
    pagesQuery = pagesQuery.eq('owner_id', userId)
  }
  const { data: ownedPages, error: pagesError } = await pagesQuery

  if (pagesError) {
    if (isSchemaMismatch(pagesError)) {
      return NextResponse.json(
        {
          code: 'SCHEMA_MISMATCH',
          message:
            'Database schema is outdated. Run the latest Supabase migrations.',
        },
        { status: 500 }
      )
    }
    return databaseError('Unable to load guestbook entries.')
  }

  if (!ownedPages || ownedPages.length === 0) {
    return NextResponse.json({ entries: [] }, { status: 200 })
  }

  const ownedPageIds = ownedPages.map((page) => page.id)
  const pageTitleById = new Map(ownedPages.map((page) => [page.id, page.title]))

  const { data: entries, error: entriesError } = await supabase
    .from('guestbook')
    .select('id, name, message, is_approved, created_at, page_id')
    .in('page_id', ownedPageIds)
    .order('created_at', { ascending: false })

  if (entriesError) {
    if (isSchemaMismatch(entriesError)) {
      return NextResponse.json(
        {
          code: 'SCHEMA_MISMATCH',
          message:
            'Database schema is outdated. Run the latest Supabase migrations.',
        },
        { status: 500 }
      )
    }
    return databaseError('Unable to load guestbook entries.')
  }

  const hydratedEntries = ((entries ?? []) as GuestbookRow[]).map((entry) => ({
    id: entry.id,
    name: entry.name,
    message: entry.message,
    is_approved: entry.is_approved,
    created_at: entry.created_at,
    pages: {
      title: pageTitleById.get(entry.page_id) ?? null,
    },
  }))

  return NextResponse.json({ entries: hydratedEntries }, { status: 200 })
}
