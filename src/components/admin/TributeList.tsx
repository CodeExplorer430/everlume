import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Page {
  id: string
  title: string
  slug: string
  created_at: string
}

interface TributeListProps {
  pages: Page[]
}

export function TributeList({ pages }: TributeListProps) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-lg font-semibold">Your Memorial Pages</h3>
      </div>
      <ul className="divide-y divide-border">
        {pages && pages.length > 0 ? (
          pages.map((page) => (
            <li key={page.id} className="px-5 py-4 transition-colors hover:bg-secondary/45">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold">{page.title}</h4>
                  <p className="text-sm text-muted-foreground">/memorials/{page.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/memorials/${page.slug}`} target="_blank">
                      View
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/admin/memorials/${page.id}`}>Edit</Link>
                  </Button>
                </div>
              </div>
            </li>
          ))
        ) : (
          <li className="px-5 py-12 text-center text-sm text-muted-foreground">No memorial pages created yet.</li>
        )}
      </ul>
    </div>
  )
}
