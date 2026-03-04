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
      <div className="relative h-[54vh] min-h-[340px] w-full bg-foreground">
        {page.hero_image_url ? (
          <Image
            src={page.hero_image_url}
            alt={page.full_name || page.title}
            fill
            sizes="100vw"
            className="object-cover opacity-70"
            priority
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/15" />
      <div className="page-container absolute inset-x-0 bottom-0 py-10 text-white md:py-14">
        <p className="mb-3 inline-flex rounded-full border border-white/35 bg-black/20 px-3 py-1 text-xs tracking-wide text-white/85">
          In Loving Memory
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">{page.title}</h1>
        <p className="mt-3 text-base italic text-white/88 md:text-xl">{page.full_name}</p>
        {(page.dob || page.dod) && (
          <p className="mt-5 text-sm uppercase tracking-[0.2em] text-white/80 md:text-base">
            {page.dob ? format(new Date(page.dob), 'MMMM d, yyyy') : '...'} - {page.dod ? format(new Date(page.dod), 'MMMM d, yyyy') : 'Present'}
          </p>
        )}
      </div>
    </section>
  )
}
