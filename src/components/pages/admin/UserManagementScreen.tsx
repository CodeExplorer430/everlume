'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Loader2, Shield, UserPlus, Users, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UserRole = 'admin' | 'editor' | 'viewer'

type ManagedUser = {
  id: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at?: string | null
  invited_at?: string | null
  deactivated_at?: string | null
}

export function UserManagementScreen() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('editor')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchUsers = useCallback(async () => {
    const response = await fetch('/api/admin/users', { cache: 'no-store' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to load users.')
      setUsers([])
      setLoading(false)
      return
    }

    const payload = (await response.json()) as { users?: ManagedUser[] }
    setUsers(payload.users ?? [])
    setErrorMessage(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return users

    return users.filter((user) => {
      const name = user.full_name?.toLowerCase() ?? ''
      return name.includes(query) || user.role.includes(query)
    })
  }, [searchQuery, users])

  const activeUsersCount = useMemo(() => users.filter((user) => user.is_active).length, [users])

  const inviteUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setErrorMessage(null)

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        fullName: inviteName,
        role: inviteRole,
      }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to invite user.')
      setSubmitting(false)
      return
    }

    const payload = (await response.json()) as { user?: ManagedUser }
    if (payload.user) {
      setUsers((current) => [payload.user!, ...current])
    } else {
      await fetchUsers()
    }

    setInviteEmail('')
    setInviteName('')
    setInviteRole('editor')
    setSubmitting(false)
  }

  const updateUser = async (userId: string, updates: Partial<{ role: UserRole; isActive: boolean }>) => {
    if (pendingUserId) return
    setPendingUserId(userId)
    setErrorMessage(null)

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to update user.')
      setPendingUserId(null)
      return
    }

    const payload = (await response.json()) as { user?: ManagedUser }
    if (payload.user) {
      setUsers((current) => current.map((user) => (user.id === userId ? payload.user! : user)))
    } else {
      await fetchUsers()
    }

    setPendingUserId(null)
  }

  const deactivateUser = async (userId: string) => {
    if (pendingUserId) return
    if (!confirm('Deactivate this user? They will lose dashboard access.')) return

    setPendingUserId(userId)
    setErrorMessage(null)

    const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to deactivate user.')
      setPendingUserId(null)
      return
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              is_active: false,
              deactivated_at: new Date().toISOString(),
            }
          : user
      )
    )

    setPendingUserId(null)
  }

  if (loading) return <div className="surface-card p-8 text-sm text-muted-foreground">Loading users...</div>

  return (
    <div className="space-y-6">
      <section className="surface-card grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="space-y-1">
          <h2 className="text-3xl font-semibold tracking-tight">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Invite admins, editors, and viewers. Control access without sharing one login.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:w-[300px]">
          <div className="rounded-lg border border-border/80 bg-[var(--surface-1)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Total Users</p>
            <p className="mt-1 text-2xl font-semibold">{users.length}</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-[var(--surface-1)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Active</p>
            <p className="mt-1 text-2xl font-semibold">{activeUsersCount}</p>
          </div>
        </div>
      </section>

      <section className="surface-card space-y-4 p-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <UserPlus className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Invite New User</h3>
        </div>

        <form onSubmit={inviteUser} className="grid gap-3 md:grid-cols-[1.2fr_1fr_160px_auto] md:items-end">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <Input
              required
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full Name</label>
            <Input required value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Alex Santos" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Role</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/70"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as UserRole)}
              aria-label="Invite role"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <Button type="submit" disabled={submitting} className="md:mb-[1px]">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Invite
              </>
            )}
          </Button>
        </form>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">Team Access</h3>
          </div>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search users or roles"
            className="sm:max-w-xs"
          />
        </div>

        {errorMessage && <p className="mx-5 mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/80 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Added</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium">{user.full_name}</td>
                    <td className="px-4 py-3">
                      <select
                        className="h-9 rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/70"
                        value={user.role}
                        onChange={(event) => updateUser(user.id, { role: event.target.value as UserRole })}
                        disabled={pendingUserId === user.id}
                        aria-label={`Role for ${user.full_name}`}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <Shield className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(user.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {user.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deactivateUser(user.id)}
                            disabled={pendingUserId === user.id}
                            className="text-destructive"
                            aria-label={`Deactivate ${user.full_name}`}
                          >
                            {pendingUserId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUser(user.id, { isActive: true })}
                            disabled={pendingUserId === user.id}
                            aria-label={`Reactivate ${user.full_name}`}
                          >
                            {pendingUserId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reactivate'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm italic text-muted-foreground">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
