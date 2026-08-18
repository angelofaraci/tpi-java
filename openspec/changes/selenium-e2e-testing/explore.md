# Exploration: Selenium WebDriver E2E testing

## Current State

**Backend tests** (`backend/pom.xml`, `backend/src/test/`): `spring-boot-starter-test` + H2 (test scope) already present. 26 test classes, all either unit tests or `@SpringBootTest`/`@AutoConfigureMockMvc` integration tests using `MockMvc` (e.g. `backend/src/test/java/com/utn/javaproject/dndsheets/DemoControllerIT.java`) — none boot a real HTTP listener or use `RANDOM_PORT`. No Selenium/HtmlUnit/Testcontainers dependency anywhere in `pom.xml`.

**Frontend structure** (`frontend/src/App.tsx`): No React Router. `App.tsx` is a single stateful controller that switches a `view` union type (`'home' | 'character-sheet' | 'create-campaign' | 'create-character' | 'view-campaign' | 'admin' | 'view-character-readonly'`) and an `authView` (`'demo' | 'login'`) — everything renders at `/` with no distinct URLs. Key flows worth E2E coverage:
- Auth: `frontend/src/pages/Login.tsx` — single component toggles login/register forms (`showRegister` state), calls `api.auth.*`.
- Demo landing (unauthenticated): `frontend/src/pages/DemoLanding.tsx`.
- Home dashboard: `frontend/src/pages/Home.tsx` — characters, campaigns, levels, sort toggle (recent `home-dense-ledger` change).
- Character CRUD: `CreateCharacter.tsx`, `Characters.tsx` (sheet view + delete flow, per recent `fix/dndclass-authorization` commits).
- Campaign CRUD: `CreateCampaign.tsx`, `ViewCampaign.tsx` (create, delete, join-by-code).
- Admin panel: `AdminPanel.tsx`.

**CI** (`.github/workflows/`): two independent workflows, each `test` job gates its own `deploy` job with no staging environment:
- `deploy-backend.yml`: `./mvnw -B test` → builds Docker image → `gcloud run deploy` directly to prod Cloud Run.
- `deploy-frontend.yml`: `npm test -- --run` (vitest) → `npm run build` (with prod `VITE_API_BASE_URL` baked in) → `firebase deploy --only hosting`.

**Dev/prod wiring** (`backend/Dockerfile`, `compose.yaml`, `deploy-frontend.yml`): the backend Dockerfile packages only the Spring Boot JAR — no static resource copy step, so Spring Boot does **not** serve the frontend. The frontend is a fully separate Vite SPA deployed to **Firebase Hosting**, calling the Cloud Run backend cross-origin via a build-time `VITE_API_BASE_URL` env var. `compose.yaml` only defines local Postgres, no frontend/backend orchestration. **Selenium cannot rely on a single co-located origin** — it must reach two independently-running processes (a live backend + a served frontend build), whether locally or in CI.

`openspec/config.yaml` already declares `testing.layers.e2e: { available: false }`, confirming this is a genuinely new testing layer, not a gap-fill.

## Affected Areas

- `backend/pom.xml` — needs `selenium-java`, relying on Selenium Manager (bundled since Selenium 4.6+) for driver binaries; new Maven profile to avoid slowing down default `mvn test`.
- `backend/src/test/java/.../e2e/` (new) — Selenium test classes, `@SpringBootTest(webEnvironment = RANDOM_PORT)` to boot the real backend on a real port.
- Frontend build artifact serving — nothing currently serves a built frontend for tests to hit; needs `vite preview` (serves the production build) pointed at the SpringBoot RANDOM_PORT via env var injection at build time.
- CI workflow(s) — architecture decision point: does an existing `test` job also run Selenium, or does a new separate workflow do it opt-in/non-blocking?
- CI environment — headless Chrome/Chromium: `ubuntu-latest` GitHub runners include Chrome preinstalled; Selenium Manager fetches matching driver over network at runtime.

## Approaches

1. **Selenium + JUnit 5 in a separate Maven profile, `@SpringBootTest(RANDOM_PORT)` backend + `vite preview` frontend, gated in its own opt-in CI workflow (not blocking deploy)**
   - Pros: doesn't slow/risk the existing fast test jobs that gate direct-to-prod deploys; isolates a newly-introduced, potentially flaky layer; low blast radius while suite matures.
   - Cons: not enforced automatically — regressions can reach prod if nobody runs it; needs its own CI wiring for two-origin coordination.
   - Effort: Medium.

2. **Integrate into `deploy-backend.yml`'s `test` job, blocking deploy on failure**
   - Pros: strongest safety guarantee, no E2E regression reaches prod.
   - Cons: couples backend CI to a frontend build/serve it doesn't own today; adds wall-clock time and Selenium/driver flakiness risk directly in the path that deploys straight to production; backend workflow only triggers on `backend/**` paths, so path-scoping breaks down.
   - Effort: Medium-High.

3. **Playwright instead of Selenium** — explicitly out of scope; user asked for Selenium.

## Recommendation

Approach 1 (separate opt-in Maven profile + workflow, non-blocking) as the starting point, given there is no staging environment today — both workflows deploy straight to prod on green tests. Promoting to a blocking gate is a natural follow-up once the suite proves stable.

## Risks

- No React Router — Selenium navigation is entirely UI-driven (click-through), more brittle, tightly coupled to `App.tsx` view-switching state.
- Two-origin coordination (backend RANDOM_PORT + `vite preview` build) needed both locally and in CI.
- No existing backend test currently boots a real HTTP server; RANDOM_PORT behavior (CORS, JWT over real network round-trip) is untested territory.
- Selenium Manager's runtime driver-resolution network calls are a known source of intermittent CI flakiness.
- CI placement (blocking vs. non-blocking) is a real trade-off requiring explicit user confirmation.

## Status

Ready for proposal. Open decision requiring user confirmation before locking design: CI placement (blocking vs. opt-in/non-blocking) for the new E2E suite.
