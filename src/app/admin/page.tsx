import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Total Pages
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {pages?.length || 0}
          </p>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Your Tribute Pages</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {pages && pages.length > 0 ? (
            pages.map((page) => (
              <li key={page.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{page.title}</h4>
                    <p className="text-sm text-gray-500">/{page.slug}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/pages/${page.slug}`} target="_blank">View</Link>
                    </Button>
                    <Button variant="primary" size="sm" asChild>
                      <Link href={`/admin/pages/${page.id}`}>Edit</Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-6 py-12 text-center text-gray-500">
              No tribute pages created yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

// Simple wrapper to support asChild-like behavior for Link if I had a more complex Button
// For now I'll just use Link inside Button or similar.
// Wait, my Button doesn't support asChild. I'll fix that.
