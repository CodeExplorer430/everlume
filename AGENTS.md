# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router routes and layouts (public pages, admin pages, auth, redirects).
- `src/components/`: Reusable UI split by domain: `admin/`, `public/`, and shared `ui/` primitives.
- `src/lib/`: Utilities and integrations (`supabase/` clients, middleware helpers, common utils).
- `tests/e2e/`: Playwright end-to-end suites.
- `tests/unit/`: Vitest unit/component/API route tests (mirrored structure from `src/`).
- `src/test/`: shared Vitest setup/runtime helpers.
- `public/`: Static assets (SVGs, icons).
- `docs/handover/`: Family-operational playbooks, transfer checklists, incident SOP, and training packet.
- `supabase/migrations/`: Ordered SQL migrations for schema, RLS, and storage setup.
- `.github/`: CI workflows, templates, CODEOWNERS, Dependabot config.
- Root config: `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `postcss.config.mjs`.

## Build, Test, and Development Commands
- `npm run dev`: Start local development server at `http://localhost:3000`.
- `npm run build`: Create a production build.
- `npm run start`: Run the built app in production mode.
- `npm run lint`: Run ESLint checks across the codebase.
- `npm run typecheck`: Run TypeScript checks with `tsc --noEmit`.
- `npm run test:unit`: Run Vitest unit/component tests.
- `npm run test:worker`: Run Cloudflare Worker redirect unit tests.
- `npm run test:coverage`: Run unit tests with coverage thresholds.
- `npm run test:e2e:install`: Install Chromium for Playwright.
- `npm run test:e2e`: Run Playwright end-to-end tests.
- `npm run test:e2e:turbopack`: Run Playwright end-to-end tests against Turbopack dev server.
- `npm run test:launch-readiness`: Run redirect-health and QR short-link launch smoke checks.
- `npm run test:perf`: Run Lighthouse CI performance + accessibility budgets.
- `npm run ops:media:prewarm`: Run optional Cloudinary transform prewarm and record run status.
- `npm run ops:check-prereqs:production`: Enforce production env/security gate before release.

Run `npm run lint && npm run typecheck && npm run test:coverage` before opening a PR.

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Indentation: 2 spaces; keep imports grouped and remove unused symbols.
- Components: `PascalCase` file and export names (for example, `TributeTimeline.tsx`).
- Hooks/utilities: `camelCase` names; route folders use Next.js conventions (`[slug]`, `route.ts`, `page.tsx`).
- Styling: Tailwind utility classes; prefer shared primitives in `src/components/ui`.
- Linting: ESLint (`eslint-config-next`) is the baseline style gate.
- Admin data boundary: in client-side admin pages/components, use `fetch('/api/admin/*')` for reads/writes. Do not query Supabase directly from admin client code.
- Authorization boundary: all `/api/admin/*` routes must use `requireAdminUser({ minRole })` from `src/lib/server/admin-auth.ts` (`viewer` read, `editor` write, `admin` user-management/audit).
- Mutation audit: every admin `POST/PATCH/DELETE` route must write an audit entry via `src/lib/server/admin-audit.ts`.
- Test policy: do not rely on implicit auth fallbacks; API tests must explicitly mock `profiles.role` and `profiles.is_active` states.

## Testing Guidelines
- Frameworks:
  - Unit/component: Vitest + React Testing Library (`jsdom`)
  - E2E: Playwright (Chromium)
- Coverage gate (CI-enforced): 10% global for lines/functions/statements/branches.
- Mock-first strategy in CI for external services (Supabase/Cloudinary/Worker integrations).
- Add/maintain route tests for each admin API endpoint (`auth`, `ownership`, `validation`, and success path).
- Add security tests for role enforcement (`401/403/200`) and private media token verification when changing auth/media code.
- Test placement:
  - Unit/component/API tests under `tests/unit/` (mirrored by source path)
  - E2E tests under `tests/e2e/`
- Minimum quality gate before merge:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:coverage`
  - `npm run test:e2e`
  - `npm run test:perf` (for performance/accessibility hardening changes)
  - `npm run test:launch-readiness` (for short-link/QR launch changes)
  - For handover/governance/doc-only PRs: include manual validation notes for operational runbooks that changed.

## Commit & Pull Request Guidelines
- Prefer concise, imperative commit messages. Existing history includes both plain and Conventional Commits (for example, `feat: add ...`); either is acceptable, but be consistent per PR.
- Keep commits focused by concern (UI, data model, auth, etc.).
- Branching model: trunk-based with short-lived branches. Use prefixes: `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*`, `test/*`.
- PRs should include:
  - clear summary and scope,
  - linked issue/task (if available),
  - screenshots or short recordings for UI changes,
  - notes on migrations/env updates,
  - local validation results (`lint`, `typecheck`, `test:coverage`, `test:e2e`).
