#!/usr/bin/env node

const requiredAppEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
  'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET',
  'NEXT_PUBLIC_SHORT_DOMAIN',
]

function isProductionCheckEnabled() {
  return (
    process.env.CHECK_PROD_SECURITY === '1' ||
    process.env.DEPLOY_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'
  )
}

const missing = requiredAppEnv.filter((key) => !process.env[key] || `${process.env[key]}`.trim() === '')
const strictProdCheck = isProductionCheckEnabled()

const securityIssues = []
if (strictProdCheck) {
  if (process.env.RATE_LIMIT_BACKEND !== 'upstash') {
    securityIssues.push('RATE_LIMIT_BACKEND must be set to "upstash" for production.')
  }
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    securityIssues.push('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for production.')
  }
  if (process.env.CAPTCHA_ENABLED !== '1') {
    securityIssues.push('CAPTCHA_ENABLED must be set to "1" for production.')
  }
  if (!process.env.CAPTCHA_SECRET || `${process.env.CAPTCHA_SECRET}`.trim() === '') {
    securityIssues.push('CAPTCHA_SECRET is required for production.')
  }
}

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

if (securityIssues.length > 0) {
  console.log('\nProduction security gate failed:')
  for (const issue of securityIssues) {
    console.log(`- ${issue}`)
  }
  console.log('\nSet required values before any production deployment.')
  process.exit(1)
}

console.log('\nAll required app environment variables are set.')
if (strictProdCheck) {
  console.log('Production security gate passed.')
}
console.log('\nReminder: Worker secrets are managed in Cloudflare dashboard or Wrangler.')
process.exit(0)
