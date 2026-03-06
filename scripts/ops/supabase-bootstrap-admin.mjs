#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { loadLocalEnv } from './load-env.mjs'

loadLocalEnv()

function readArg(name) {
  const flag = `--${name}=`
  const entry = process.argv.find((arg) => arg.startsWith(flag))
  return entry ? entry.slice(flag.length) : ''
}

function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

async function resolveUserIdByEmail(client, email) {
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`Failed to list auth users: ${error.message}`)

    const users = data?.users ?? []
    const hit = users.find((user) => normalizeEmail(user.email ?? '') === email)
    if (hit?.id) return hit.id

    if (users.length < perPage) break
    page += 1
  }

  return ''
}

async function main() {
  const emailArg = readArg('email')
  const fullNameArg = readArg('full-name')

  const rawEmail = emailArg || process.env.ADMIN_EMAIL || ''
  const email = normalizeEmail(rawEmail)

  if (!email) {
    console.error('Missing admin email. Pass --email=you@example.com or set ADMIN_EMAIL.')
    process.exit(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (fallback: SUPABASE_SERVICE_ROLE_KEY) in environment.')
    process.exit(1)
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const userId = await resolveUserIdByEmail(client, email)
  if (!userId) {
    console.error(`No auth user found for email "${email}". Sign in at least once first.`)
    process.exit(1)
  }

  const fullName = fullNameArg || email.split('@')[0] || 'Admin'
  const now = new Date().toISOString()
  const payload = {
    id: userId,
    email,
    role: 'admin',
    is_active: true,
    invited_at: now,
    deactivated_at: null,
    updated_at: now,
  }

  // Prefer modern schema (full_name). Fallback supports legacy DBs that still use name.
  let { data, error } = await client
    .from('profiles')
    .upsert(
      {
        ...payload,
        full_name: fullName,
      },
      { onConflict: 'id' }
    )
    .select('id, full_name, role, is_active, invited_at, deactivated_at')
    .single()

  if (error?.message?.includes("Could not find the 'full_name' column")) {
    const legacy = await client
      .from('profiles')
      .upsert(
        {
          ...payload,
          name: fullName,
        },
        { onConflict: 'id' }
      )
      .select('id, name, role, is_active, invited_at, deactivated_at')
      .single()

    data = legacy.data
    error = legacy.error

    if (!error) {
      console.warn(
        'Bootstrapped using legacy profiles.name column. Apply latest migrations to add profiles.full_name.'
      )
    }
  }

  if (error) {
    console.error(`Failed to bootstrap admin profile: ${error.message}`)
    process.exit(1)
  }

  console.log('Admin profile bootstrapped successfully.')
  console.log(JSON.stringify(data, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
