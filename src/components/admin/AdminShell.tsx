'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, LayoutGrid, BookOpenText, Link2, MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
  { href: '/admin/memorials/new', label: 'Create Memorial', icon: BookOpenText },
  { href: '/admin/guestbook', label: 'Guestbook', icon: MessageCircle },
  { href: '/admin/settings', label: 'Short Links', icon: Link2 },
]

interface AdminShellProps {
  userEmail?: string
  children: React.ReactNode
}

export function AdminShell({ userEmail, children }: AdminShellProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/90 bg-[var(--surface-2)] backdrop-blur-md">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <div>
              <p className="text-sm font-semibold tracking-wide">Everlume Admin</p>
              <p className="text-xs text-muted-foreground">Manage pages and memories</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-muted-foreground sm:block">{userEmail}</p>
            <form action="/auth/signout" method="post">
              <Button variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="page-container grid grid-cols-1 gap-6 py-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside
          className={cn(
            'surface-card p-3 md:sticky md:top-24 md:block md:h-fit',
            open ? 'block' : 'hidden md:block'
          )}
        >
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent/65'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  )
}
