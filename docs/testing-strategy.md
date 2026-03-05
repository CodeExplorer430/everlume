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
- `npm run test:e2e:turbopack`: run e2e against Turbopack dev server (diagnostic mode)
- `npm run test:all`: run coverage + e2e

## E2E Runtime Mode
- Default e2e runner uses webpack-backed Next dev for stability.
- Turbopack e2e can fail on some environments with LightningCSS/Tailwind module resolution. Keep Turbopack runs as diagnostic mode until upstream/toolchain behavior stabilizes.

## Coverage Policy
Global coverage threshold (enforced in CI):
- Lines: 10%
- Functions: 10%
- Statements: 10%
- Branches: 10%

Coverage scope:
- Vitest coverage now scans all `src/**/*.{ts,tsx}` with explicit exclusions for declaration/setup artifacts.

## Mocking Strategy
CI and local tests are mock-first for external systems:
- Supabase calls are mocked in unit/component tests
- Cloudinary widget integration is mocked in component tests
- E2E flows focus on deterministic UX and routing smoke checks

## Trust Boundary Coverage
Server mutation endpoints are covered with focused route tests:
- `POST /api/guestbook`
- `POST /api/admin/pages`
- `GET /api/admin/guestbook`
- `POST /api/admin/redirects`
- `GET /api/admin/redirects`
- `DELETE /api/admin/redirects/:id`
- `POST /api/admin/videos`
- `GET /api/admin/pages/:id/videos`
- `DELETE /api/admin/videos/:id`
- `POST /api/admin/photos`
- `GET /api/admin/pages/:id/photos`
- `PATCH /api/admin/photos/:id`
- `DELETE /api/admin/photos/:id`
- `POST /api/admin/timeline`
- `GET /api/admin/pages/:id/timeline`
- `PATCH /api/admin/pages/:id`
- `GET /api/admin/pages/:id`
- `GET /api/admin/pages/:id/redirects`
- `GET /api/admin/pages/:id/guestbook`

These tests verify validation, auth/ownership checks, and success-path persistence calls.

## Test Placement
- Keep unit/component/API tests under `tests/unit/` with a mirrored source-path structure.
- Keep E2E tests under `tests/e2e`.

## CI Artifacts
- Unit coverage report uploaded from `coverage/unit`
- Playwright report and traces uploaded on each CI run
