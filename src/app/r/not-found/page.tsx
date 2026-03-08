import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/public'

type RedirectFallbackPageProps = {
  searchParams: Promise<{ code?: string; reason?: string }>
}

const reasonText: Record<string, string> = {
  invalid: 'The short link format is invalid.',
  missing: 'This short link does not exist.',
  disabled: 'This short link was disabled by an admin.',
}

async function getHomeDirectoryEnabled() {
  const supabase = createPublicClient()
  const { data, error } = await supabase.from('site_settings').select('home_directory_enabled').eq('id', 1).single()
  if (error) return false
  return data?.home_directory_enabled === true
}

export default async function RedirectFallbackPage({ searchParams }: RedirectFallbackPageProps) {
  const params = await searchParams
  const reason = params.reason ? reasonText[params.reason] || reasonText.missing : reasonText.missing
  const code = params.code || 'unknown'
  const directoryEnabled = await getHomeDirectoryEnabled()

  return (
    <main id="main-content" className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-3 rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Redirect not available
      </span>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">We couldn&apos;t open this short link.</h1>
      <p className="mt-3 text-sm text-foreground/85">
        <span className="font-medium text-foreground">/{code}</span> is unavailable right now. {reason}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium transition hover:bg-secondary">
          Back to Home
        </Link>
        {directoryEnabled ? (
          <Link href="/#memorial-directory" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90">
            Browse Public Memorials
          </Link>
        ) : null}
      </div>
    </main>
  )
}
