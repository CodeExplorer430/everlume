import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <h1 className="text-2xl font-serif font-bold text-gray-900">Digital Tribute</h1>
        <nav>
          <Button variant="ghost" asChild>
            <Link href="/login">Admin Login</Link>
          </Button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <h2 className="text-5xl md:text-7xl font-serif font-bold text-gray-900 leading-tight">
            Preserve Their Story, Forever.
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Create a beautiful, lasting digital memorial for your loved ones. 
            Share photos, videos, timelines, and messages with family and friends 
            through a simple QR code on their memorial.
          </p>
          <div className="flex space-x-4">
            <Button size="lg" asChild>
              <Link href="/login">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
        <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-2xl">
           <div className="absolute inset-0 flex items-center justify-center text-gray-300 italic">
             [Beautiful Memorial Image Placeholder]
           </div>
        </div>
      </main>

      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="space-y-4">
            <h3 className="text-2xl font-serif font-bold text-gray-900">Easy to Share</h3>
            <p className="text-gray-600">
              Generate a custom QR code to print on memorial tablets, cards, or plaques.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-serif font-bold text-gray-900">Multimedia Gallery</h3>
            <p className="text-gray-600">
              Upload photos and embed videos to capture every precious moment.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-serif font-bold text-gray-900">Interactive Guestbook</h3>
            <p className="text-gray-600">
              Allow visitors to leave messages and share their own memories.
            </p>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-gray-100 text-center text-gray-500">
        <p>© {new Date().getFullYear()} Digital Tribute. All rights reserved.</p>
      </footer>
    </div>
  )
}