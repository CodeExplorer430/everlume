# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router routes and layouts (public pages, admin pages, auth, redirects).
- `src/components/`: Reusable UI split by domain: `admin/`, `public/`, and shared `ui/` primitives.
- `src/lib/`: Utilities and integrations (`supabase/` clients, middleware helpers, common utils).
- `public/`: Static assets (SVGs, icons).
- `supabase/migrations/`: Ordered SQL migrations for schema, RLS, and storage setup.
- Root config: `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `postcss.config.mjs`.

## Build, Test, and Development Commands
- `npm run dev`: Start local development server at `http://localhost:3000`.
- `npm run build`: Create a production build.
- `npm run start`: Run the built app in production mode.
- `npm run lint`: Run ESLint checks across the codebase.
- `npm run typecheck`: Run TypeScript checks with `tsc --noEmit`.

Run `npm run lint && npm run typecheck` before opening a PR.

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Indentation: 2 spaces; keep imports grouped and remove unused symbols.
- Components: `PascalCase` file and export names (for example, `TributeTimeline.tsx`).
- Hooks/utilities: `camelCase` names; route folders use Next.js conventions (`[slug]`, `route.ts`, `page.tsx`).
- Styling: Tailwind utility classes; prefer shared primitives in `src/components/ui`.
- Linting: ESLint (`eslint-config-next`) is the baseline style gate.

## Testing Guidelines
- There is currently no dedicated unit/integration test framework configured.
- Minimum quality gate: `npm run lint` and `npm run typecheck` must pass.
- For feature changes, include manual verification steps in PRs (affected routes, admin/public flows, edge cases).
- If adding tests, colocate them near the feature (`*.test.ts`/`*.test.tsx`) and document how to run them.

## Commit & Pull Request Guidelines
- Prefer concise, imperative commit messages. Existing history includes both plain and Conventional Commits (for example, `feat: add ...`); either is acceptable, but be consistent per PR.
- Keep commits focused by concern (UI, data model, auth, etc.).
- PRs should include:
  - clear summary and scope,
  - linked issue/task (if available),
  - screenshots or short recordings for UI changes,
  - notes on migrations/env updates,
  - local validation results (`lint`, `typecheck`, and manual checks).
