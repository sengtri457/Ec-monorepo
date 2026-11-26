# 11 — Testing and Validation

## Automated Test Suites

| Workspace | Runner | Command | Observed Result |
|---|---|---|---|
| `@ec/map-basemap` | Node 22 `node --test` | `pnpm --filter @ec/map-basemap test` | 18/18 passed (5 suites) |
| `apps/web` | Vitest + React Testing Library (`jsdom`) | `pnpm --filter web test` | 7/7 passed (2 test files: `fetch-road-route.test.ts`, `DeliveryMapView.test.tsx`) |
| `apps/admin` | Vitest + React Testing Library (`jsdom`) | `pnpm --filter admin test` | 3/3 passed (1 test file: `FleetDispatchMap.test.tsx`) |

## Lint, Typecheck & Production Builds

| Check | Command | Observed Result |
|---|---|---|
| `@ec/map-basemap` typecheck | `pnpm --filter @ec/map-basemap lint` (`tsc --noEmit`) | Passed (0 errors) |
| Workspace lint | `pnpm lint` (`turbo run lint`) | Passed (0 errors; 1 pre-existing warning in untouched `apps/web/context/AuthContext.tsx`) |
| Lockfile integrity | `pnpm install --frozen-lockfile` | Passed |
| Web production build | `pnpm --filter web build` (`next build --webpack`) | Passed (12/12 pages) |
| Admin production build | `pnpm --filter admin build` (`next build` Turbopack) | Passed (10/10 pages) |
| Worker bundle generation | `sync:worker` (`prebuild`) | Verified `apps/web/public/maplibre-gl-worker.mjs` and `apps/admin/public/maplibre-gl-worker.mjs` (550,754 bytes each) |

## Live Browser & E2E Pipeline Verification

- Executed in Task 26 (`verify_delivery_pipeline.py` + `browser` subagent verification against Kubernetes `web` & `admin` deployments). Results will be recorded upon completion of Task 26.
