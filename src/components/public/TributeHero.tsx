import { format } from 'date-fns'

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
    <section className="relative h-[60vh] bg-foreground flex items-center justify-center text-white overflow-hidden">
      {page.hero_image_url ? (
        <img
          src={page.hero_image_url}
          alt={page.full_name || page.title}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 opacity-60" />
      )}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">{page.title}</h1>
        <p className="text-xl md:text-2xl font-light italic">{page.full_name}</p>
        {(page.dob || page.dod) && (
          <p className="mt-4 text-lg md:text-xl tracking-widest uppercase">
            {page.dob ? format(new Date(page.dob), 'MMMM d, yyyy') : '...'} — {page.dod ? format(new Date(page.dod), 'MMMM d, yyyy') : 'Present'}
          </p>
        )}
      </div>
    </section>
  )
}
