'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, LayoutGrid, BookOpenText, Link2, MessageCircle, Users, X, Sparkles, ChartColumn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
  { href: '/admin/memorials/new', label: 'Create Memorial', icon: BookOpenText },
  { href: '/admin/guestbook', label: 'Guestbook', icon: MessageCircle },
  { href: '/admin/settings', label: 'Short Links', icon: Link2 },
  { href: '/admin/reports', label: 'Reports', icon: ChartColumn },
  { href: '/admin/users', label: 'Users', icon: Users },
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
      <header className="sticky top-0 z-30 border-b border-border/80 bg-[var(--surface-2)]/92 backdrop-blur-xl">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation menu">
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <Link href="/admin" className="group inline-flex items-center gap-3 rounded-xl px-1 py-1">
              <span className="rounded-2xl border border-border/80 bg-[var(--surface-1)] p-2 shadow-[0_12px_24px_rgba(41,49,40,0.08)]">
                <Sparkles className="h-4 w-4 text-primary" />
              </span>
              <div>
                <p className="text-sm font-semibold tracking-wide">Everlume Admin</p>
                <p className="text-xs text-muted-foreground">Manage memorials with confidence</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-border/70 bg-[var(--surface-1)] px-3 py-1.5 text-xs text-muted-foreground sm:block">
              {userEmail}
            </div>
            <form action="/auth/signout" method="post">
              <Button variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="page-container grid grid-cols-1 gap-6 py-7 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside
          className={cn(
            'surface-card p-3 md:sticky md:top-24 md:block md:h-fit',
            open ? 'block' : 'hidden md:block'
          )}
        >
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition-colors',
                    isActive
                      ? 'border-primary/30 bg-primary/14 text-foreground shadow-[0_12px_24px_rgba(72,97,79,0.08)]'
                      : 'border-transparent text-foreground hover:border-border/70 hover:bg-accent/65'
                  )}
                >
                  <span className={cn('rounded-xl p-2', isActive ? 'bg-white/75' : 'bg-transparent')}>
                    <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <main id="main-content" className="space-y-6 pb-8">{children}</main>
      </div>
    </div>
  )
}
