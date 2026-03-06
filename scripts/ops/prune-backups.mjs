#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

const bucket = process.env.R2_BUCKET
const endpoint = process.env.R2_ENDPOINT
const prefix = process.env.BACKUP_PREFIX || 'everlume/db-backups'
const dailyRetentionDays = Number(process.env.DAILY_RETENTION_DAYS || '30')
const weeklyRetentionWeeks = Number(process.env.WEEKLY_RETENTION_WEEKS || '12')
const dryRun = process.env.DRY_RUN === '1'

if (!bucket) {
  console.error('R2_BUCKET is required.')
  process.exit(1)
}

const awsArgsBase = ['s3api']
if (endpoint) {
  awsArgsBase.push('--endpoint-url', endpoint)
}

function runAwsJson(args) {
  const output = execFileSync('aws', [...awsArgsBase, ...args, '--output', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return JSON.parse(output)
}

function runAws(args) {
  execFileSync('aws', [...awsArgsBase, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function cutoffMs(kind) {
  const now = Date.now()
  if (kind === 'daily') return now - dailyRetentionDays * 24 * 60 * 60 * 1000
  if (kind === 'weekly') return now - weeklyRetentionWeeks * 7 * 24 * 60 * 60 * 1000
  return now
}

const list = runAwsJson([
  'list-objects-v2',
  '--bucket',
  bucket,
  '--prefix',
  `${prefix}/`,
])

const objects = Array.isArray(list.Contents) ? list.Contents : []
let deleted = 0

for (const object of objects) {
  const key = object.Key
  if (!key || typeof key !== 'string') continue

  const parts = key.split('/')
  const kind = parts[2]
  if (kind !== 'daily' && kind !== 'weekly') continue

  const modified = new Date(object.LastModified).getTime()
  if (Number.isNaN(modified)) continue

  if (modified >= cutoffMs(kind)) continue

  if (dryRun) {
    console.log(`[DRY_RUN] delete ${key}`)
  } else {
    runAws(['delete-object', '--bucket', bucket, '--key', key])
    console.log(`deleted ${key}`)
    deleted += 1
  }
}

console.log(`retention complete; deleted=${deleted}; dryRun=${dryRun}`)
