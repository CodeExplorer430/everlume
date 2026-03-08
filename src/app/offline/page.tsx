import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main id="main-content" className="page-container flex min-h-[70vh] items-center justify-center py-12">
      <section className="surface-card w-full max-w-3xl space-y-6 p-6 md:p-8">
        <div className="space-y-2 text-center md:text-left">
          <p className="section-kicker">Offline Support</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">You are currently offline</h1>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Everlume can keep recently visited public memorials available for reading, but new guestbook posts, admin changes, and short-link lookups still need a live connection.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="surface-card p-4">
            <p className="text-sm font-semibold text-foreground">Recently viewed memorials</p>
            <p className="mt-2 text-sm text-muted-foreground">If this device already opened a public memorial, try returning to it directly from your browser history or home screen.</p>
          </div>
          <div className="surface-card p-4">
            <p className="text-sm font-semibold text-foreground">QR and short links</p>
            <p className="mt-2 text-sm text-muted-foreground">Printed QR plaques and short codes may fail until the connection returns because redirects still need to be resolved online.</p>
          </div>
          <div className="surface-card p-4">
            <p className="text-sm font-semibold text-foreground">Tablet use</p>
            <p className="mt-2 text-sm text-muted-foreground">For event tablets, keep the memorial open ahead of time and install Everlume to the home screen for a steadier on-site fallback.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
          <Link href="/" className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-secondary">
            Back to Home
          </Link>
          <Link
            href="/offline"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-95"
          >
            Check Connection Again
          </Link>
        </div>
      </section>
    </main>
  )
}
