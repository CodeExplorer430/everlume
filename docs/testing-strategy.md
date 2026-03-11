# Testing Strategy

## Scope

This repository uses a layered strategy:

- **Unit/component tests:** Vitest + React Testing Library
- **E2E tests:** Playwright (Chromium)
- **Static quality gates:** ESLint + TypeScript

## Commands

- `npm run test:unit`: run unit/component tests
- `npm run test:coverage`: run tests with V8 coverage gates
- `npm run test:e2e:install`: install Chromium browser for Playwright
- `npm run test:e2e`: run Playwright end-to-end tests (webpack-backed Next dev)
- `npm run test:e2e:auth`: run the password-based admin auth Playwright lane with fake test-only credentials
- `npm run test:launch-readiness`: run redirect health + short-link QR launch smoke checks
- `npm run test:a11y`: run Playwright accessibility smoke suite
- `npm run test:perf`: run Lighthouse CI performance/accessibility budget checks
- `npm run test:e2e:turbopack`: run e2e against Turbopack dev server (diagnostic compatibility lane)
- `npm run test:all`: run the main unit coverage + webpack e2e + auth e2e smoke aggregate

## E2E Runtime Mode

- Default e2e runner uses webpack-backed Next dev for stability.
- Default e2e smoke coverage still uses `E2E_BYPASS_ADMIN_AUTH=1` for deterministic admin UI coverage.
- The dedicated auth lane uses `E2E_FAKE_AUTH=1` and `NEXT_PUBLIC_E2E_FAKE_AUTH=1` to exercise login, deactivated-account rejection, and password reset/setup without depending on hosted Supabase.
- Turbopack e2e remains non-blocking diagnostic coverage until upstream/toolchain behavior stabilizes.
- For local debugging, `PLAYWRIGHT_REUSE_EXISTING_SERVER=1` allows the test scripts to reuse an already-running app server instead of failing port preflight.

## Coverage Policy

Global coverage threshold (enforced in CI):

- Lines: 85%
- Functions: 85%
- Statements: 85%
- Branches: 75%

Coverage scope:

- Vitest coverage now scans all `src/**/*.{ts,tsx}` with explicit exclusions for declaration/setup artifacts.

## Mocking Strategy

CI and local tests are mock-first for external systems:

- Supabase calls are mocked in unit/component tests
- Cloudinary widget integration is mocked in component tests
- E2E flows are split between deterministic UI smoke checks and the dedicated password-auth lane
- Lighthouse CI enforces score budgets for `/`, `/login`, and short-link fallback route.

## Trust Boundary Coverage

Server mutation endpoints are covered with focused route tests:

- `POST /api/guestbook`
- `POST /api/admin/memorials`
- `GET /api/admin/guestbook`
- `POST /api/admin/redirects`
- `GET /api/admin/redirects`
- `PATCH /api/admin/redirects/:id`
- `DELETE /api/admin/redirects/:id`
- `GET /api/health/redirects`
- `POST /api/admin/videos`
- `GET /api/admin/memorials/:id/videos`
- `DELETE /api/admin/videos/:id`
- `POST /api/admin/photos`
- `GET /api/admin/memorials/:id/photos`
- `PATCH /api/admin/photos/:id`
- `DELETE /api/admin/photos/:id`
- `POST /api/admin/timeline`
- `GET /api/admin/memorials/:id/timeline`
- `PATCH /api/admin/memorials/:id`
- `GET /api/admin/memorials/:id`
- `GET /api/admin/memorials/:id/redirects`
- `GET /api/admin/memorials/:id/guestbook`

These tests verify validation, auth/ownership checks, and success-path persistence calls.
Short-link routing behavior is also covered (`GET /r/[code]` active, missing, disabled paths).

## Test Placement

- Keep unit/component/API tests under `tests/unit/` with a mirrored source-path structure.
- Keep E2E tests under `tests/e2e`.

## CI Artifacts

- Unit coverage report uploaded from `coverage/unit`
- Playwright report and traces uploaded on each CI run
- Turbopack Playwright reports are still uploaded when the diagnostic lane fails
