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
- `npm run test:e2e`: run Playwright end-to-end tests
- `npm run test:all`: run coverage + e2e

## Coverage Policy
Global coverage threshold (enforced in CI):
- Lines: 90%
- Functions: 90%
- Statements: 90%
- Branches: 90%

## Mocking Strategy
CI and local tests are mock-first for external systems:
- Supabase calls are mocked in unit/component tests
- Cloudinary widget integration is mocked in component tests
- E2E flows focus on deterministic UX and routing smoke checks

## Test Placement
- Place tests near implementation as `*.test.ts`/`*.test.tsx`
- Keep E2E tests under `tests/e2e`

## CI Artifacts
- Unit coverage report uploaded from `coverage/unit`
- Playwright report and traces uploaded on each CI run
