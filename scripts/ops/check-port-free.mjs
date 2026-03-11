#!/usr/bin/env node

import { createServer } from 'node:net'

const portArg = process.argv[2]
const port = Number(portArg)
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === '1'

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error('Usage: node scripts/ops/check-port-free.mjs <port>')
  process.exit(1)
}

const host = '127.0.0.1'
const server = createServer()

server.once('error', (err) => {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    err.code === 'EADDRINUSE'
  ) {
    if (reuseExistingServer) {
      console.warn(
        `Port ${port} is already in use on ${host}. Reusing the existing server because PLAYWRIGHT_REUSE_EXISTING_SERVER=1.`
      )
      process.exit(0)
    }

    console.error(
      `Port ${port} is already in use on ${host}. Stop the existing process and rerun test:e2e.`
    )
    process.exit(1)
  }

  if (err && typeof err === 'object' && 'code' in err && err.code === 'EPERM') {
    console.warn(
      `Port preflight skipped due to permission limits (${err.code}) in this environment.`
    )
    process.exit(0)
  }

  console.error(
    `Unable to verify port ${port}: ${(err && err.message) || String(err)}`
  )
  process.exit(1)
})

server.listen(port, host, () => {
  server.close(() => {
    process.exit(0)
  })
})
