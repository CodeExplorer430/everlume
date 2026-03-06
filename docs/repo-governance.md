# Repository Governance

## Branching Model
Trunk-based development:
- Protected long-lived branch: `main`
- Short-lived branches: `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*`, `test/*`
- Merge strategy: squash merge

## Required CI Checks
Require these statuses before merge:
- `lint`
- `typecheck`
- `unit_coverage`
- `worker_tests`
- `e2e`
- `a11y`
- `launch_readiness`
- `perf_a11y_gate`
- `build`

## GitHub Settings Checklist
Configure in GitHub repository settings:
1. Branch protection/ruleset for `main`
2. Require PR review approvals
3. Dismiss stale approvals on new commits
4. Block force-push and branch deletion
5. Restrict direct pushes to `main`
6. Enable Dependabot alerts and security updates
7. Enable secret scanning (if available)

## Ownership and Templates
- CODEOWNERS: `.github/CODEOWNERS`
- PR template: `.github/pull_request_template.md`
- Issue templates: `.github/ISSUE_TEMPLATE/*`

## Local Guardrails
- Husky pre-commit hook runs lint, typecheck, and unit tests
- `lint-staged` enforces clean staged changes for TS/JS files
