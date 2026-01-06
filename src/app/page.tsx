import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <h1 className="text-2xl font-serif font-bold text-foreground">Digital Tribute</h1>
        <nav>
          <Button variant="ghost" asChild>
            <Link href="/login">Admin Login</Link>
          </Button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <h2 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-tight">
            Preserve Their Story, Forever.
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Create a beautiful, lasting digital memorial for your loved ones. 
            Share photos, videos, timelines, and messages with family and friends 
            through a simple QR code on their memorial.
          </p>
          <div className="flex space-x-4">
            <Button size="lg" asChild>
              <Link href="/login">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">Learn More</Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-square bg-gradient-to-br from-background to-secondary rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border border-border">
           <div className="text-center p-8">
             <div className="bg-card p-6 rounded-full inline-block shadow-sm mb-6 backdrop-blur-sm">
               <Heart className="h-12 w-12 text-primary fill-primary/20" />
             </div>
             <p className="text-muted-foreground font-serif italic text-lg">
               &quot;To live in hearts we leave behind is not to die.&quot;
             </p>
           </div>
        </div>
      </main>

      <section id="how-it-works" className="bg-card py-24 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">How it Works</h2>
            <p className="text-muted-foreground mt-4 text-lg">Creating a lasting legacy in three simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="text-4xl font-serif text-primary/40 font-bold">01</div>
              <h3 className="text-xl font-bold text-foreground">Create & Personalize</h3>
              <p className="text-muted-foreground leading-relaxed">
                Set up a tribute page with a custom URL. Add a biography, meaningful dates, and a beautiful hero image that captures their spirit.
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-4xl font-serif text-primary/40 font-bold">02</div>
              <h3 className="text-xl font-bold text-foreground">Share the Journey</h3>
              <p className="text-muted-foreground leading-relaxed">
                Bulk upload cherished photos and embed videos. Create a life timeline to walk visitors through the milestones that mattered most.
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-4xl font-serif text-primary/40 font-bold">03</div>
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-foreground">Connect with QR</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Generate a print-ready QR code for memorial plaques or tablets. Visitors scan to instantly access the tribute and leave their own messages.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-4">
              <div className="bg-secondary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="text-primary h-8 w-8" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-foreground">Always Accessible</h3>
              <p className="text-muted-foreground">
                A mobile-first experience designed to be viewed anywhere—especially at memorial sites through a durable QR connection.
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-secondary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="text-primary h-8 w-8" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-foreground">Moderated Memories</h3>
              <p className="text-muted-foreground">
                A secure guestbook where friends and family can share stories, with full moderation tools to keep the space respectful.
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-secondary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="text-primary h-8 w-8" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-foreground">Family Ownership</h3>
              <p className="text-muted-foreground">
                Maintain full control over content and privacy. Export all data and photos at any time for your personal archives.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-foreground py-20 text-center">
        <div className="max-w-3xl mx-auto px-6 space-y-8">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-background">Ready to preserve a legacy?</h2>
          <p className="text-background/70 text-lg">
            Start creating a digital sanctuary for your loved one today. It only takes a few minutes to begin.
          </p>
          <Button size="lg" variant="secondary" asChild className="px-12 py-8 text-xl">
            <Link href="/login">Get Started Now</Link>
          </Button>
        </div>
      </section>

      <footer className="py-12 border-t border-border text-center text-muted-foreground bg-background">
        <p>© {new Date().getFullYear()} Digital Tribute. All rights reserved.</p>
      </footer>
    </div>
  )
}