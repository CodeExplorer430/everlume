import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main id="main-content" className="page-container flex min-h-[70vh] items-center justify-center py-12">
      <section className="surface-card w-full max-w-lg space-y-4 p-6 text-center md:p-8">
        <h1 className="text-2xl font-semibold">You are currently offline</h1>
        <p className="text-sm text-muted-foreground">
          Some previously visited memorial pages may still be viewable from cache, but live updates and admin actions require a network connection.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-secondary">
            Back to Home
          </Link>
          <Link
            href="/offline"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-95"
          >
            Try Again
          </Link>
        </div>
      </section>
    </main>
  )
}
