#!/usr/bin/env node

const requiredAppEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
  'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET',
  'NEXT_PUBLIC_SHORT_DOMAIN',
]

const missing = requiredAppEnv.filter((key) => !process.env[key] || `${process.env[key]}`.trim() === '')

console.log('Everlume pre-deploy prerequisites check')
console.log('=====================================')

if (missing.length > 0) {
  console.log('\nMissing app environment variables:')
  for (const key of missing) {
    console.log(`- ${key}`)
  }

  console.log('\nSet them in `.env.local` for local runs and in Vercel/GitHub as needed.')
  console.log('Cloudflare Worker secrets to set separately:')
  console.log('- SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  console.log('- FALLBACK_URL')
  process.exit(1)
}

console.log('\nAll required app environment variables are set.')
console.log('\nReminder: Worker secrets are managed in Cloudflare dashboard or Wrangler.')
process.exit(0)
