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

## Security Workflows

Additional security-oriented workflows maintained in the repository:

- `CodeQL`
- `Dependency Review`
- `Generate SBOM`

These provide static analysis, dependency change review, and supply-chain
artifact generation. They should remain enabled even when not yet wired into
branch protection.

## GitHub Settings Checklist

Configure in GitHub repository settings:

1. Branch protection/ruleset for `main`
2. Require PR review approvals
3. Dismiss stale approvals on new commits
4. Block force-push and branch deletion
5. Restrict direct pushes to `main`
6. Enable Dependabot alerts and security updates
7. Enable secret scanning (if available)
8. Enable Dependency Graph so dependency review workflows remain actionable

## Ownership and Templates

- CODEOWNERS: `.github/CODEOWNERS`
- PR template: `.github/pull_request_template.md`
- Issue templates: `.github/ISSUE_TEMPLATE/*`

## Local Guardrails

- Husky pre-commit hook runs lint, typecheck, and unit tests
- `lint-staged` enforces clean staged changes for TS/JS files

## Deferred Tooling Upgrades

- `eslint@10` is intentionally deferred on the current stack.
- Current blocker: `eslint-config-next@16.1.6` and its bundled
  `eslint-plugin-react@7.37.5` fail during lint startup under ESLint 10 with
  `contextOrFilename.getFilename is not a function`.
- Revisit the upgrade only when a newer published Next lint stack supports
  ESLint 10 cleanly, or if the project explicitly chooses to replace the
  current Next-provided lint configuration with a custom flat-config stack.
