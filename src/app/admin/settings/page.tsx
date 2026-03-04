/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'

export default function AdminSettings() {
  const [redirects, setRedirects] = useState<any[]>([])
  const [shortcode, setShortcode] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchRedirects = useCallback(async () => {
    const { data } = await supabase.from('redirects').select('*').order('created_at', { ascending: false })
    setRedirects(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRedirects()
  }, [fetchRedirects])

  const createRedirect = async (e: React.FormEvent) => {
    e.preventDefault()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('redirects').insert({
      shortcode,
      target_url: targetUrl,
      created_by: user?.id,
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

  if (loading) return <div className="surface-card p-8 text-sm text-muted-foreground">Loading short links...</div>

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Short URL Management</h2>
        <p className="text-sm text-muted-foreground">Create and maintain redirect codes used in printed QR plaques.</p>
      </div>

      <form onSubmit={createRedirect} className="surface-card space-y-4 p-6">
        <h3 className="border-b border-border pb-2 text-base font-semibold">Create New Redirect</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Short Code</label>
            <Input required value={shortcode} onChange={(e) => setShortcode(e.target.value)} placeholder="grandma" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Target URL</label>
            <Input required value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://.../memorials/sample" />
          </div>
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          Create Redirect
        </Button>
      </form>

      <div className="surface-card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold">Existing Redirects</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/80 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Short Link</th>
                <th className="px-4 py-3 text-left">Target</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {redirects.length > 0 ? (
                redirects.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">/r/{r.shortcode}</td>
                    <td className="px-4 py-3 max-w-sm truncate text-muted-foreground">{r.target_url}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteRedirect(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm italic text-muted-foreground">
                    No redirects created.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
