type Counter = {
  count: number
  resetAt: number
}

const store = new Map<string, Counter>()

type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

function checkRateLimitInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt }
  }

  current.count += 1
  store.set(key, current)
  return { allowed: true, remaining: Math.max(limit - current.count, 0), resetAt: current.resetAt }
}

async function upstashCommand<T>(command: string[]) {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!baseUrl || !token) return null

  const response = await fetch(`${baseUrl}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command]),
    cache: 'no-store',
  })

  if (!response.ok) return null
  const body = (await response.json()) as Array<{ result?: T }>
  return body[0]?.result ?? null
}

async function checkRateLimitUpstash(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const count = await upstashCommand<number>(['INCR', key])
  if (!count) return null

  if (count === 1) {
    await upstashCommand<number>(['PEXPIRE', key, String(windowMs)])
  }

  const ttl = (await upstashCommand<number>(['PTTL', key])) ?? windowMs
  const now = Date.now()
  return {
    allowed: count <= limit,
    remaining: Math.max(limit - count, 0),
    resetAt: now + Math.max(ttl, 0),
  }
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const backend = process.env.RATE_LIMIT_BACKEND || 'memory'
  if (backend === 'upstash') {
    const distributed = await checkRateLimitUpstash(key, limit, windowMs)
    if (distributed) return distributed
  }
  return checkRateLimitInMemory(key, limit, windowMs)
}

export function getClientIp(forwardedFor: string | null) {
  if (!forwardedFor) return 'unknown'
  return forwardedFor.split(',')[0]?.trim() || 'unknown'
}
