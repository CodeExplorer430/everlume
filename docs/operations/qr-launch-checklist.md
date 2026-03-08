# QR Launch Checklist

Use this checklist before printing memorial plaques/cards and before production release.

## 1) Redirect Readiness
- Create short links in Admin Settings using `^[a-z0-9-]{3,32}$`.
- Confirm each short link target is correct and reachable.
- Mark each printed link as `Verified` after physical scan testing.
- Keep production links `Active`; disable only when intentionally retired.

## 2) Print Asset Readiness
- Generate QR from the memorial editor QR panel (short-link only).
- Download both formats:
  - `SVG (Engraving Safe)` for engraving vendors.
  - `PNG (2048px Print)` for print shops.
- Save final vendor-approved files in shared backup storage.

## 3) Scan Validation
- Test with at least 2 devices (iOS + Android) and 2 camera apps.
- Test lighting extremes: indoor low light and bright outdoor light.
- Validate behavior:
  - active link -> memorial page opens,
  - disabled/unknown link -> `/r/not-found` fallback page.

## 4) Ops Validation
- Run local quality gate:
  ```bash
  npm run lint
  npm run typecheck
  npm run test:coverage
  npm run test:e2e:webpack
  npm run test:e2e:auth
  ```
- Confirm redirect health endpoint:
  - `GET /api/health/redirects` returns `{ ok: true }`.

## 5) Rollback
- If a target URL is wrong, update redirect target first (no reprint needed).
- If scans fail in production, temporarily disable affected shortcode.
- Update fallback messaging if incident persists > 30 minutes.
