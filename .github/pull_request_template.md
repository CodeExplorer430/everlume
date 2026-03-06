## Summary
- What changed and why

## Scope
- [ ] UI/UX
- [ ] Data model / migration
- [ ] CI/CD / infrastructure
- [ ] Docs
- [ ] Security

## Validation
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test:coverage`
- [ ] `npm run test:e2e` (or justify skip)
- [ ] `npm run test:perf` (for performance/accessibility-sensitive changes)
- [ ] `npm run test:e2e:webpack -- --grep "admin manages short links and sees QR section on memorial edit"` for QR launch changes

## Checklist
- [ ] Linked issue/task
- [ ] Added/updated tests
- [ ] Updated docs/AGENTS if behavior or workflow changed
- [ ] For short-link changes: verified `/r/[code]` fallback behavior and QR print status handling
- [ ] Included screenshots/recording for UI changes
- [ ] No secrets/credentials committed

## Risks / Notes
- Known risks and rollback notes
