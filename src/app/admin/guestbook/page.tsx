/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Check, Trash2, X } from 'lucide-react'

export default function GuestbookModeration() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from('guestbook')
      .select('*, pages(title)')
      .order('created_at', { ascending: false })
    
    setEntries(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const approveEntry = async (id: string) => {
    const { error } = await supabase
      .from('guestbook')
      .update({ is_approved: true })
      .eq('id', id)
    
    if (error) alert(error.message)
    fetchEntries()
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    const { error } = await supabase
      .from('guestbook')
      .delete()
      .eq('id', id)
    
    if (error) alert(error.message)
    fetchEntries()
  }

  const unapproveEntry = async (id: string) => {
    const { error } = await supabase
      .from('guestbook')
      .update({ is_approved: false })
      .eq('id', id)
    
    if (error) alert(error.message)
    fetchEntries()
  }

  if (loading) return <div className="p-8 text-black">Loading...</div>

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Guestbook Moderation</h2>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From / Page</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.length > 0 ? (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {entry.is_approved ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Approved
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                    <div className="text-sm text-gray-500">{entry.pages?.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 line-clamp-2" title={entry.message}>
                      {entry.message}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(entry.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {!entry.is_approved ? (
                      <Button variant="ghost" size="sm" onClick={() => approveEntry(entry.id)} className="text-green-600 hover:text-green-900">
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => unapproveEntry(entry.id)} className="text-yellow-600 hover:text-yellow-900">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <button onClick={() => deleteEntry(entry.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                  No guestbook entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
