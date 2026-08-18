# Apply Progress: Selenium WebDriver E2E Testing Layer

Status as of this update: Phase 1 (Harness Foundation, PR 1) was already complete and committed prior to this session (stacked base branch `feat/selenium-e2e-harness`). Phase 2 (Auth + Dashboard Flows, PR 2, tasks 2.1-2.5) is now complete and green on branch `feat/selenium-e2e-auth-home`. Phases 3-5 (PR 3) not started — out of scope for this session.

## Phase 2 — Auth + Dashboard Flows (PR 2) — DONE

- **2.1** (RED): `backend/src/test/java/com/utn/javaproject/dndsheets/e2e/AuthFlowIT.java` created — calls `registerAndLogin(uniqueUsername())` then asserts `home-dashboard` is displayed. Verified RED against the pre-existing (unmodified) frontend build+preview: failed with `TimeoutException` waiting for `[data-testid='login-form']` — confirmed missing-selector failure, not a backend/compile error (`137/137` unit tests unaffected, embedded Spring context on port 18080 booted fine).
- **2.2** (GREEN): added `data-testid` to `frontend/src/pages/Login.tsx` per design.md's selector list (`login-form`, `login-username`, `login-password`, `login-submit`, `login-error`/`register-error`, `show-register`, `register-form`, `register-email`, `register-username`, `register-password`, `register-confirm`, `register-submit`, `show-login`) and `data-testid="home-dashboard"` on `Home.tsx`'s root `<div>`. Re-ran `AuthFlowIT` until green.
- **2.3** (RED): `backend/src/test/java/com/utn/javaproject/dndsheets/e2e/HomeDashboardIT.java` created — reuses `registerAndLogin`, asserts `home-welcome`, `home-new-character`, `home-new-campaign`, `home-logout`, `home-characters-count`, `home-campaigns-count` are all displayed. Verified RED: `NoSuchElementException` on `[data-testid='home-welcome']` — confirmed missing-selector failure.
- **2.4** (GREEN): added the above `data-testid`s to `frontend/src/pages/Home.tsx` (welcome `<h1>`, the two header action buttons, logout button) and threaded an optional `testId` prop through `frontend/src/components/MetricTile.tsx` to tag the campaigns/characters metric values. Re-ran `HomeDashboardIT` until green.
- **2.5**: `mvn -Pe2e verify -Dit.test=AuthFlowIT,HomeDashboardIT` → both green (2/2, same reused Spring context). `mvn test` (no profile) still runs exactly the pre-existing **137** tests (no `*IT` class picked up) — unaffected by the profile-scoped Failsafe addition. Frontend `npx vitest run` also still green: **297/297** across 22 files (no regression from the `data-testid`/`testId` prop additions).

### Real local verification harness used for this session (not committed, ephemeral)

- Installed `chromium` via `dnf` (no Chrome/Chromium was present in this sandbox) — `chromium-browser` resolves to Chromium 151, matching ChromeDriver 151 via Selenium Manager.
- Built the frontend with `VITE_API_BASE_URL=http://localhost:18080 npm run build` and served it with `npx vite preview --port 4173 --strictPort` in the background for each RED/GREEN cycle; `mvn -Pe2e verify` boots the backend itself via `@SpringBootTest(webEnvironment = DEFINED_PORT)`, so no separate backend process was needed.
- `JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk` required for all `./mvnw` invocations (system default `java` is 17; project targets 21).

### Harness bug discovered and fixed (blocked GREEN, required touching the already-committed Phase 1 `E2EBaseTest.java`)

`E2EBaseTest.registerAndLogin(username)` (as committed in PR 1) assumed two things that don't match the actual app:

1. **The app boots on an unauthenticated "demo landing" page (`DemoLanding.tsx`), not the login form.** `driver.get(FRONTEND_URL)` lands on `DemoLanding`; a "Log In / Sign Up" button (`onLoginRequest`) must be clicked to switch `App.tsx`'s `authView` state to `'login'` before `[data-testid='login-form']` exists in the DOM at all. Fixed by adding `data-testid="demo-login-request"` to that button in `DemoLanding.tsx` and clicking it first in `registerAndLogin`.
2. **`POST /register` auto-authenticates.** `AuthService.register(...)` always returns a JWT (`AuthResponse` with `token`), so `Login.tsx`'s `handleRegister` calls `onAuthSuccess()` directly and the app never returns to the login form after a successful registration — there is no separate manual-login step in this product's actual auth flow. The original harness method filled the register form, then waited for `login-form` to reappear and filled a second login form — that wait always timed out (15s) because the app was already on `home-dashboard`. Fixed by removing the redundant login-form/login-submit steps from `registerAndLogin`; it now waits directly for `home-dashboard` after `register-submit`.

Both fixes are in `backend/src/test/java/com/utn/javaproject/dndsheets/e2e/support/E2EBaseTest.java`, scoped to `registerAndLogin` only — no other harness method changed. This file is shared by all future `*IT` classes (Phase 3), so this fix also unblocks PR 3 without further harness rework.

### Deviation from design.md's `data-testid` table

design.md lists a `home-root` selector for `Home.tsx`; tasks.md's 2.2 line instead explicitly says to "confirm/add `data-testid="home-dashboard"` on the authenticated `Home.tsx` (or `App.tsx`) root" (this also matches the already-committed `E2EBaseTest.registerAndLogin`'s wait target from Phase 1). Followed tasks.md/the existing harness contract and used `home-dashboard` as the single root marker; did not additionally add a separate `home-root` attribute (would have required either overloading one element with two `data-testid`s, which isn't valid HTML/CSS-selector-wise, or an extra inert wrapper element with no test value).

## Notes for continuation / follow-up

- Local verification processes (`vite preview`, `chromium`) were stopped/cleaned up before ending the session; nothing left running.
- Test gates used this session:
  - Backend unit: `JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw test` (from `backend/`)
  - Backend E2E: `JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw -Pe2e verify -Dit.test=AuthFlowIT,HomeDashboardIT` (from `backend/`, with `vite preview` already running on `:4173`)
  - Frontend unit: `npx vitest run` (from `frontend/`)
- Phase 3 (`CreateCharacterIT`, `DeleteCharacterIT`, `CreateCampaignIT` + their `data-testid`s), Phase 4 (CI workflow), and Phase 5 (cleanup/docs) are untouched — next `sdd-apply` session should pick up at task 3.1.
