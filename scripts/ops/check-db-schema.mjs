#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { loadLocalEnv } from './load-env.mjs'

loadLocalEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (fallback: SUPABASE_SERVICE_ROLE_KEY).')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const checks = [
  { column: 'role', select: 'id, role' },
  { column: 'is_active', select: 'id, is_active' },
  { column: 'full_name', select: 'id, full_name' },
]

const missing = []

for (const check of checks) {
  const { error } = await supabase.from('profiles').select(check.select).limit(1)
  if (error?.message?.includes(`'${check.column}'`)) {
    missing.push(check.column)
  } else if (error) {
    console.error(`Failed schema check for profiles.${check.column}: ${error.message}`)
    process.exit(1)
  }
}

if (missing.length > 0) {
  console.error(`Missing required profiles columns: ${missing.join(', ')}`)
  console.error('Run hosted migrations: npm run ops:supabase:migrate:hosted -- <project-ref>')
  process.exit(1)
}

const videoChecks = [
  { label: 'videos.provider', table: 'videos', select: 'id, provider' },
  { label: 'video_upload_jobs table', table: 'video_upload_jobs', select: 'id, page_id, created_by, status, source_filename, source_mime, source_bytes' },
]

for (const check of videoChecks) {
  const { error } = await supabase.from(check.table).select(check.select).limit(1)
  if (error) {
    console.error(`Failed schema check for ${check.label}: ${error.message}`)
    console.error('Run hosted migrations: npm run ops:supabase:migrate:hosted -- <project-ref>')
    process.exit(1)
  }
}

console.log('Schema check passed: profiles, videos.provider, and video_upload_jobs schema are available.')
