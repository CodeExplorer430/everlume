# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router routes and layouts (public pages, admin pages, auth, redirects).
- `src/components/`: Reusable UI split by domain: `admin/`, `public/`, and shared `ui/` primitives.
- `src/lib/`: Utilities and integrations (`supabase/` clients, middleware helpers, common utils).
- `tests/e2e/`: Playwright end-to-end suites.
- `src/test/`: shared unit-test setup for Vitest.
- `public/`: Static assets (SVGs, icons).
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
- `npm run test:coverage`: Run unit tests with coverage thresholds.
- `npm run test:e2e:install`: Install Chromium for Playwright.
- `npm run test:e2e`: Run Playwright end-to-end tests.

Run `npm run lint && npm run typecheck && npm run test:coverage` before opening a PR.

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Indentation: 2 spaces; keep imports grouped and remove unused symbols.
- Components: `PascalCase` file and export names (for example, `TributeTimeline.tsx`).
- Hooks/utilities: `camelCase` names; route folders use Next.js conventions (`[slug]`, `route.ts`, `page.tsx`).
- Styling: Tailwind utility classes; prefer shared primitives in `src/components/ui`.
- Linting: ESLint (`eslint-config-next`) is the baseline style gate.

## Testing Guidelines
- Frameworks:
  - Unit/component: Vitest + React Testing Library (`jsdom`)
  - E2E: Playwright (Chromium)
- Coverage gate (CI-enforced): 90% global for lines/functions/statements/branches.
- Mock-first strategy in CI for external services (Supabase/Cloudinary/Worker integrations).
- Test placement:
  - Unit/component tests colocated as `*.test.ts`/`*.test.tsx`
  - E2E tests under `tests/e2e/`
- Minimum quality gate before merge:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:coverage`
  - `npm run test:e2e`

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
