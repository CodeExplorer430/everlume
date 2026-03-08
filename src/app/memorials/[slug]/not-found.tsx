import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function TributeNotFound() {
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="page-container flex min-h-[70vh] flex-col items-center justify-center">
        <div className="surface-card max-w-lg space-y-4 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">404</p>
          <h2 className="text-3xl font-semibold">Memorial page not found</h2>
          <p className="text-sm text-muted-foreground">
            This memorial may be private, password protected, unpublished, or the link may be incorrect. Please verify the direct link or ask the
            family admin for an updated URL.
          </p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
