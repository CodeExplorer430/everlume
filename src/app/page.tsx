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
              <Link href="#features">Learn More</Link>
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

      <section id="features" className="bg-card py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="space-y-4">
            <h3 className="text-2xl font-serif font-bold text-foreground">Easy to Share</h3>
            <p className="text-muted-foreground">
              Generate a custom QR code to print on memorial tablets, cards, or plaques.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-serif font-bold text-foreground">Multimedia Gallery</h3>
            <p className="text-muted-foreground">
              Upload photos and embed videos to capture every precious moment.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-serif font-bold text-foreground">Interactive Guestbook</h3>
            <p className="text-muted-foreground">
              Allow visitors to leave messages and share their own memories.
            </p>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-border text-center text-muted-foreground">
        <p>© {new Date().getFullYear()} Digital Tribute. All rights reserved.</p>
      </footer>
    </div>
  )
}