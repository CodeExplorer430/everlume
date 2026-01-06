import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { TributeList } from '@/components/admin/TributeList'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: pages } = await supabase
    .from('pages')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <Button asChild>
          <Link href="/admin/pages/new">Create New Tribute</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Quick stats could go here */}
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Total Pages
          </h3>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {pages?.length || 0}
          </p>
        </div>
      </div>

      <TributeList pages={pages || []} />
    </div>
  )
}

// Simple wrapper to support asChild-like behavior for Link if I had a more complex Button
// For now I'll just use Link inside Button or similar.
// Wait, my Button doesn't support asChild. I'll fix that.
