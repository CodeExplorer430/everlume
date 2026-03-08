import { format } from 'date-fns'
import Image from 'next/image'

interface TributeHeroProps {
  page: {
    title: string
    full_name: string | null
    dob: string | null
    dod: string | null
    hero_image_url: string | null
  }
}

export function TributeHero({ page }: TributeHeroProps) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative h-[66vh] min-h-[420px] w-full bg-foreground">
        {page.hero_image_url ? (
          <Image
            src={page.hero_image_url}
            alt={page.full_name || page.title}
            fill
            sizes="100vw"
            className="object-cover opacity-76"
            priority
          />
        ) : (
          <div data-testid="hero-fallback" className="h-full w-full bg-[linear-gradient(180deg,#3a3d34_0%,#24281f_100%)]" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/30 to-black/10" />
      <div className="page-container absolute inset-x-0 bottom-0 py-10 text-white md:py-16">
        <div className="max-w-4xl rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(15,16,15,0.18),rgba(15,16,15,0.32))] p-6 backdrop-blur-[6px] md:p-8">
        <p className="mb-3 inline-flex rounded-full border border-white/35 bg-black/20 px-3 py-1 text-xs tracking-wide text-white/85">
          In Loving Memory
        </p>
        <h1 className="max-w-3xl font-display text-5xl font-semibold leading-none md:text-7xl">{page.title}</h1>
        <p className="mt-4 text-base italic text-white/88 md:text-xl">{page.full_name}</p>
        {(page.dob || page.dod) && (
          <p className="mt-6 text-sm uppercase tracking-[0.24em] text-white/80 md:text-base">
            {page.dob ? format(new Date(page.dob), 'MMMM d, yyyy') : '...'} - {page.dod ? format(new Date(page.dod), 'MMMM d, yyyy') : 'Present'}
          </p>
        )}
        </div>
      </div>
    </section>
  )
}
