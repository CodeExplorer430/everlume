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
    <div className="bg-card shadow-sm rounded-lg border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">Your Tribute Pages</h3>
      </div>
      <ul className="divide-y divide-border">
        {pages && pages.length > 0 ? (
          pages.map((page) => (
            <li key={page.id} className="px-6 py-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{page.title}</h4>
                  <p className="text-sm text-muted-foreground">/{page.slug}</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/pages/${page.slug}`} target="_blank">View</Link>
                  </Button>
                  <Button variant="primary" size="sm" asChild>
                    <Link href={`/admin/pages/${page.id}`}>Edit</Link>
                  </Button>
                </div>
              </div>
            </li>
          ))
        ) : (
          <li className="px-6 py-12 text-center text-muted-foreground">
            No tribute pages created yet.
          </li>
        )}
      </ul>
    </div>
  )
}
