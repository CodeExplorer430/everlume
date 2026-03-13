import { getAppBaseUrl } from '@/lib/site-url'
import { NextResponse } from 'next/server'

function toOrigin(value: string | null | undefined) {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function validateAdminMutationOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // Non-browser callers used in tests and internal tooling may omit both
  // headers. Browser-initiated writes should always present one of them.
  if (!origin && !referer) {
    return null
  }

  const requestOrigin = toOrigin(request.url)
  if (!requestOrigin) {
    return NextResponse.json(
      {
        code: 'FORBIDDEN',
        message: 'Cross-origin admin requests are not allowed.',
      },
      { status: 403 }
    )
  }

  const candidateOrigin = toOrigin(origin || referer)
  if (!candidateOrigin) {
    return NextResponse.json(
      {
        code: 'FORBIDDEN',
        message: 'Cross-origin admin requests are not allowed.',
      },
      { status: 403 }
    )
  }

  const allowedOrigins = new Set<string>([
    requestOrigin,
    getAppBaseUrl().origin,
  ])

  if (!allowedOrigins.has(candidateOrigin)) {
    return NextResponse.json(
      {
        code: 'FORBIDDEN',
        message: 'Cross-origin admin requests are not allowed.',
      },
      { status: 403 }
    )
  }

  return null
}
