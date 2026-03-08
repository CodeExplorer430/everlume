import { format } from 'date-fns'
import Image from 'next/image'

interface TributeHeroProps {
  memorial: {
    title: string
    full_name: string | null
    dob: string | null
    dod: string | null
    hero_image_url: string | null
  }
}

export function TributeHero({ memorial }: TributeHeroProps) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative h-[66vh] min-h-[420px] w-full bg-foreground">
        {memorial.hero_image_url ? (
          <Image
            src={memorial.hero_image_url}
            alt={memorial.full_name || memorial.title}
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
        <h1 className="max-w-3xl font-display text-5xl font-semibold leading-none md:text-7xl">{memorial.title}</h1>
        <p className="mt-4 text-base italic text-white/88 md:text-xl">{memorial.full_name}</p>
        {(memorial.dob || memorial.dod) && (
          <p className="mt-6 text-sm uppercase tracking-[0.24em] text-white/80 md:text-base">
            {memorial.dob ? format(new Date(memorial.dob), 'MMMM d, yyyy') : '...'} - {memorial.dod ? format(new Date(memorial.dod), 'MMMM d, yyyy') : 'Present'}
          </p>
        )}
        </div>
      </div>
    </section>
  )
}
