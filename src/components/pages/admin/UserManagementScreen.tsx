'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { KeyRound, Loader2, Mail, RefreshCcw, Shield, UserPlus, UserX, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UserRole = 'admin' | 'editor' | 'viewer'
type UserAction = 'update' | 'deactivate' | 'invite' | 'reset'

type ManagedUser = {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  account_state: 'active' | 'invited' | 'deactivated'
  created_at: string
  updated_at?: string | null
  invited_at?: string | null
  deactivated_at?: string | null
}

async function signOutAfterSelfDeactivation() {
  try {
    await fetch('/auth/signout', {
      method: 'POST',
      redirect: 'manual',
    })
  } finally {
    window.location.assign('/login')
  }
}

export function UserManagementScreen() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pending, setPending] = useState<{ userId: string; action: UserAction } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
    const kickoff = setTimeout(() => {
      void fetchUsers()
    }, 0)

    return () => clearTimeout(kickoff)
  }, [fetchUsers])

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return users

    return users.filter((user) => {
      const name = user.full_name?.toLowerCase() ?? ''
      const email = user.email?.toLowerCase() ?? ''
      return name.includes(query) || email.includes(query) || user.role.includes(query)
    })
  }, [searchQuery, users])

  const activeUsersCount = useMemo(() => users.filter((user) => user.is_active).length, [users])
  const inactiveUsersCount = users.length - activeUsersCount
  const pendingUsersCount = useMemo(() => users.filter((user) => user.account_state === 'invited' && user.is_active).length, [users])

  const startAction = (userId: string, action: UserAction) => {
    if (pending) return false
    setPending({ userId, action })
    setErrorMessage(null)
    setSuccessMessage(null)
    return true
  }

  const endAction = () => {
    setPending(null)
  }

  const inviteUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

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
      const invitedUser = payload.user
      setUsers((current) => [invitedUser, ...current])
    } else {
      await fetchUsers()
    }

    setInviteEmail('')
    setInviteName('')
    setInviteRole('editor')
    setSuccessMessage('Invitation email sent.')
    setSubmitting(false)
  }

  const updateUser = async (userId: string, updates: Partial<{ role: UserRole; isActive: boolean }>) => {
    if (!startAction(userId, 'update')) return

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to update user.')
      endAction()
      return
    }

    const payload = (await response.json()) as { user?: ManagedUser; shouldSignOutSelf?: boolean }
    if (payload.user) {
      setUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, ...payload.user! } : user))
      )
    } else {
      await fetchUsers()
    }

    if (payload.shouldSignOutSelf) {
      await signOutAfterSelfDeactivation()
      return
    }

    setSuccessMessage(typeof updates.isActive === 'boolean' ? 'Account status updated.' : 'Role updated.')
    endAction()
  }

  const deactivateUser = async (userId: string) => {
    if (!confirm('Deactivate this user? They will lose dashboard access until reactivated.')) return
    if (!startAction(userId, 'deactivate')) return

    const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to deactivate user.')
      endAction()
      return
    }

    const payload = (await response.json().catch(() => null)) as { user?: ManagedUser; shouldSignOutSelf?: boolean } | null
    if (payload?.user) {
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...payload.user! } : user)))
    } else {
      setUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? {
                ...user,
                is_active: false,
                account_state: 'deactivated',
                deactivated_at: new Date().toISOString(),
              }
            : user
        )
      )
    }

    if (payload?.shouldSignOutSelf) {
      await signOutAfterSelfDeactivation()
      return
    }

    setSuccessMessage('User deactivated.')
    endAction()
  }

  const resendInvite = async (userId: string) => {
    if (!startAction(userId, 'invite')) return

    const response = await fetch(`/api/admin/users/${userId}/invite`, { method: 'POST' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to resend invite.')
      endAction()
      return
    }

    const payload = (await response.json()) as { user?: ManagedUser; message?: string }
    if (payload.user) {
      setUsers((current) => current.map((user) => (user.id === userId ? payload.user ?? user : user)))
    }
    setSuccessMessage(payload.message || 'Invite email sent.')
    endAction()
  }

  const sendPasswordReset = async (userId: string) => {
    if (!startAction(userId, 'reset')) return

    const response = await fetch(`/api/admin/users/${userId}/reset-password`, { method: 'POST' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to send password reset.')
      endAction()
      return
    }

    const payload = (await response.json()) as { message?: string }
    setSuccessMessage(payload.message || 'Password reset email sent.')
    endAction()
  }

  if (loading) return <div className="surface-card p-8 text-sm text-muted-foreground">Loading users...</div>

  return (
    <div className="space-y-6">
      <section className="dashboard-hero surface-card grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Access Control</p>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-foreground md:text-4xl">User Management</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Give every collaborator a named account, role-based permissions, and their own password workflow without sharing one family login.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Total" value={users.length} />
          <MetricCard label="Active" value={activeUsersCount} accent="active" />
          <MetricCard label="Pending" value={pendingUsersCount} />
          <MetricCard label="Inactive" value={inactiveUsersCount} />
        </div>
      </section>

      <section className="surface-card space-y-4 p-6">
        <div className="flex items-center gap-2 border-b border-border/70 pb-3">
          <UserPlus className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Invite New User</h3>
        </div>

        <form onSubmit={inviteUser} className="grid gap-3 xl:grid-cols-[1.2fr_1fr_180px_auto] xl:items-end">
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
              className="form-select h-11 w-full"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as UserRole)}
              aria-label="Invite role"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <Button type="submit" disabled={submitting} className="xl:mb-[1px]">
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

        <p className="text-xs leading-relaxed text-muted-foreground">
          Invitations send the user to a secure password setup flow. Use reset emails later if they need to rotate credentials.
        </p>
      </section>

      {(errorMessage || successMessage) && (
        <div className={`surface-card flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between ${errorMessage ? 'border-destructive/30 text-destructive' : 'border-emerald-300/70 text-emerald-900'}`}>
          <p>{errorMessage || successMessage}</p>
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            <RefreshCcw className="h-4 w-4" />
            Refresh list
          </Button>
        </div>
      )}

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">Team Access</h3>
          </div>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search users, emails, or roles"
            className="sm:max-w-xs"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/75 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Added</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isPending = pending?.userId === user.id
                  const accountState = user.account_state
                  return (
                    <tr key={user.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.invited_at && (
                            <p className="text-xs text-muted-foreground">Last invite sent {format(new Date(user.invited_at), 'MMM d, yyyy')}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          className="form-select h-10 min-w-[124px]"
                          value={user.role}
                          onChange={(event) => updateUser(user.id, { role: event.target.value as UserRole })}
                          disabled={isPending}
                          aria-label={`Role for ${user.full_name}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        {accountState === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/70 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <Shield className="h-3 w-3" />
                            Active
                          </span>
                        ) : accountState === 'invited' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            <Mail className="h-3 w-3" />
                            Pending Setup
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300/80 bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{format(new Date(user.created_at), 'MMM d, yyyy')}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendInvite(user.id)}
                            disabled={isPending}
                            aria-label={`Resend invite to ${user.full_name}`}
                          >
                            {isPending && pending?.action === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            Invite
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendPasswordReset(user.id)}
                            disabled={isPending}
                            aria-label={`Send password reset to ${user.full_name}`}
                          >
                            {isPending && pending?.action === 'reset' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                            Reset
                          </Button>
                          {user.is_active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deactivateUser(user.id)}
                              disabled={isPending}
                              className="text-destructive"
                              aria-label={`Deactivate ${user.full_name}`}
                            >
                              {isPending && pending?.action === 'deactivate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => updateUser(user.id, { isActive: true })}
                              disabled={isPending}
                              aria-label={`Reactivate ${user.full_name}`}
                            >
                              {isPending && pending?.action === 'update' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reactivate'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm italic text-muted-foreground">
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

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'active'
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${accent === 'active' ? 'border-emerald-300/70 bg-emerald-50' : 'border-border/70 bg-[var(--surface-1)]'}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
