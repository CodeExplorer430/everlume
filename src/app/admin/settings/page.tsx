'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'

export default function AdminSettings() {
  const [redirects, setRedirects] = useState<any[]>([])
  const [shortcode, setShortcode] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchRedirects = useCallback(async () => {
    const { data } = await supabase
      .from('redirects')
      .select('*')
      .order('created_at', { ascending: false })
    
    setRedirects(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchRedirects()
  }, [fetchRedirects])

  const createRedirect = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase.from('redirects').insert({
      shortcode,
      target_url: targetUrl,
      created_by: user?.id
    })

    if (error) alert(error.message)
    else {
      setShortcode('')
      setTargetUrl('')
      fetchRedirects()
    }
  }

  const deleteRedirect = async (id: string) => {
    const { error } = await supabase.from('redirects').delete().eq('id', id)
    if (error) alert(error.message)
    fetchRedirects()
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="space-y-12">
      <h2 className="text-2xl font-bold text-gray-800">Short URL Management</h2>

      <form onSubmit={createRedirect} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4 max-w-2xl">
        <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">Create New Redirect</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Short Code (e.g., jane)</label>
            <Input
              required
              value={shortcode}
              onChange={(e) => setShortcode(e.target.value)}
              placeholder="jane"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Target URL</label>
            <Input
              required
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://.../pages/jane-doe"
            />
          </div>
        </div>
        <Button type="submit" className="w-full">Create Redirect</Button>
      </form>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Existing Redirects</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Short Link</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {redirects.length > 0 ? (
              redirects.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    /r/{r.shortcode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                    {r.target_url}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => deleteRedirect(r.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500 italic">No redirects created.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
