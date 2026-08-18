# Apply Progress: Selenium WebDriver E2E Testing Layer

Status as of this update: Phase 1 (Harness Foundation, PR 1) and Phase 2 (Auth + Dashboard Flows, PR 2) were already complete and committed prior to this session. **Phases 3, 4, and 5 (PR 3, the final PR of this 3-PR chain) are now complete** on branch `feat/selenium-e2e-character-campaign-ci`, stacked on `feat/selenium-e2e-auth-home`. All 5 `*IT` classes exist, pass individually and together, and `mvn test` remains unaffected (137/137).

## Phase 2 — Auth + Dashboard Flows (PR 2) — DONE (carried over, unchanged this session)

- **2.1** (RED): `backend/src/test/java/com/utn/javaproject/dndsheets/e2e/AuthFlowIT.java` created — calls `registerAndLogin(uniqueUsername())` then asserts `home-dashboard` is displayed. Verified RED against the pre-existing (unmodified) frontend build+preview: failed with `TimeoutException` waiting for `[data-testid='login-form']` — confirmed missing-selector failure, not a backend/compile error (`137/137` unit tests unaffected, embedded Spring context on port 18080 booted fine).
- **2.2** (GREEN): added `data-testid` to `frontend/src/pages/Login.tsx` per design.md's selector list (`login-form`, `login-username`, `login-password`, `login-submit`, `login-error`/`register-error`, `show-register`, `register-form`, `register-email`, `register-username`, `register-password`, `register-confirm`, `register-submit`, `show-login`) and `data-testid="home-dashboard"` on `Home.tsx`'s root `<div>`. Re-ran `AuthFlowIT` until green.
- **2.3** (RED): `backend/src/test/java/com/utn/javaproject/dndsheets/e2e/HomeDashboardIT.java` created — reuses `registerAndLogin`, asserts `home-welcome`, `home-new-character`, `home-new-campaign`, `home-logout`, `home-characters-count`, `home-campaigns-count` are all displayed. Verified RED: `NoSuchElementException` on `[data-testid='home-welcome']` — confirmed missing-selector failure.
- **2.4** (GREEN): added the above `data-testid`s to `frontend/src/pages/Home.tsx` (welcome `<h1>`, the two header action buttons, logout button) and threaded an optional `testId` prop through `frontend/src/components/MetricTile.tsx` to tag the campaigns/characters metric values. Re-ran `HomeDashboardIT` until green.
- **2.5**: `mvn -Pe2e verify -Dit.test=AuthFlowIT,HomeDashboardIT` → both green (2/2, same reused Spring context). `mvn test` (no profile) still runs exactly the pre-existing **137** tests (no `*IT` class picked up) — unaffected by the profile-scoped Failsafe addition. Frontend `npx vitest run` also still green: **297/297** across 22 files (no regression from the `data-testid`/`testId` prop additions).

### Harness bug discovered and fixed in Phase 2 (blocked GREEN, required touching the already-committed Phase 1 `E2EBaseTest.java`)

`E2EBaseTest.registerAndLogin(username)` (as committed in PR 1) assumed two things that don't match the actual app:

1. **The app boots on an unauthenticated "demo landing" page (`DemoLanding.tsx`), not the login form.** Fixed by adding `data-testid="demo-login-request"` to that button in `DemoLanding.tsx` and clicking it first in `registerAndLogin`.
2. **`POST /register` auto-authenticates.** The original harness method filled the register form, then waited for `login-form` to reappear and filled a second login form — that wait always timed out. Fixed by removing the redundant login-form/login-submit steps from `registerAndLogin`; it now waits directly for `home-dashboard` after `register-submit`.

Both fixes are in `E2EBaseTest.java`, scoped to `registerAndLogin` only. This file is shared by all `*IT` classes, so those fixes also unblocked Phase 3's work without further harness rework.

---

## Phase 3 — Character + Campaign Flows (PR 3) — DONE

### 5.2 finding, resolved before writing 3.1's RED test

**Campaign creation IS a hard prerequisite for character creation** (design.md's open question). Evidence: `CreateCharacter.validateForm` in `frontend/src/pages/CreateCharacter.tsx` unconditionally rejects submission with `campaignId: 'Campaign is required'` whenever `draft.campaignId` is unset, and `campaignId` is only ever set after a successful `api.campaigns.findByCode` lookup against a real join code (triggered by the debounced `handleCampaignCodeChange`). There is no way to submit the create-character form without first resolving a valid join code from an existing campaign.

Consequence for task sequencing: `CreateCharacterIT`'s arrangement needs a working "create a campaign and read its join code" step *before* its own RED test can meaningfully fail on missing `CreateCharacter.tsx`/`CharacterCard.tsx` selectors specifically (as opposed to failing earlier, on missing campaign-flow selectors, which would conflate two different GREEN steps). To keep every RED/GREEN cycle genuine per Strict TDD, **actual implementation order was 3.5 → 3.6 (`CreateCampaignIT`) → 3.1 → 3.2 (`CreateCharacterIT`) → 3.3 → 3.4 (`DeleteCharacterIT`) → 3.7**, not the numeric 3.1→3.6 order tasks.md originally listed. tasks.md keeps the original numbering for traceability but now carries a note on this reordering.

Added a shared harness helper to `E2EBaseTest.java` (reused by `CreateCharacterIT` for its own flow assertions and by `DeleteCharacterIT` as pure arrangement):

- `createCampaignAndGetJoinCode(String campaignName)`: clicks `home-new-campaign`, fills the reused `#campaign-name` id, submits via `create-campaign-submit`, waits for `join-code-modal`, reads `join-code-value`, dismisses via `join-code-dismiss`, returns the code.
- `createCharacter(String characterName, String joinCode)`: clicks `home-new-character`, fills the join code and reused `#character-name`/`#character-alignment`/`#character-background`/`#character-race`/`#character-class` ids (first non-placeholder option for the two `<select>`s), submits via `create-character-submit`, waits for `home-dashboard`.
- `byId(String id)`: new helper alongside the existing `testId(String)`, for the several pre-existing form fields design.md calls out as "reused as-is" (`campaign-name`, `character-name`, `character-alignment`, `character-background`, `character-race`, `character-class`, `character-campaign-code`) rather than duplicating them as `data-testid`s.

### 3.5 (RED) / 3.6 (GREEN) — `CreateCampaignIT`

- **3.5 RED**: `CreateCampaignIT.java` created — registers, calls `createCampaignAndGetJoinCode(...)`, asserts the join code is non-blank and the campaign name appears in `home-rail-list`. Ran `mvn -Pe2e verify -Dit.test=CreateCampaignIT`: failed with `TimeoutException` waiting for `[data-testid='create-campaign-form']` — confirmed missing-selector failure (backend context/registration/auth all succeeded first).
- **3.6 GREEN**: added `data-testid` to `frontend/src/pages/CreateCampaign.tsx` (`create-campaign-form`, `create-campaign-submit`, `create-campaign-cancel`, `create-campaign-error`). Added an optional `testId` prop to `frontend/src/components/ui/Modal.tsx` (same pattern as `MetricTile.tsx`'s `testId` prop from Phase 2) to tag the dialog wrapper, and used it plus new `join-code-value`/`join-code-dismiss` testids on the join-code modal in `frontend/src/App.tsx`. Re-ran `CreateCampaignIT`: green (1/1).

### 3.1 (RED) / 3.2 (GREEN) — `CreateCharacterIT`

- **3.1 RED**: `CreateCharacterIT.java` created — registers, creates a campaign via the now-green `createCampaignAndGetJoinCode`, then drives the create-character form directly (join code, name, alignment, background, race, class) and asserts the new character's name appears on a `character-card`. Ran: failed with `TimeoutException` waiting for `[data-testid='create-character-form']` — confirmed the campaign-flow setup succeeded and the failure was specifically on the not-yet-added `CreateCharacter.tsx` selectors, exactly as intended by the reordering above.
- **3.2 GREEN**: added `data-testid` to `frontend/src/pages/CreateCharacter.tsx` (`create-character-form`, `create-character-submit`, `create-character-cancel`, `create-character-error`) and to `frontend/src/components/CharacterCard.tsx` (`character-card`, `character-card-name`, `character-card-delete`). Also added **one testid beyond design.md's table**: `character-campaign-code-valid` on the "✓ Campaign: `<name>`" confirmation paragraph in `CreateCharacter.tsx` — needed because campaign-code validation is debounced (600ms) and asynchronous; without a stable `data-testid` to wait on, the harness would have had to rely on a fixed sleep or a text-based wait, both disallowed by spec.md's "Stable Selector Strategy" requirement. Re-ran `CreateCharacterIT`.

**Real backend bug found and fixed while chasing 3.2's GREEN** (same "unblock GREEN with a minimal, evidenced fix" pattern as Phase 2's harness fixes, this time in production code): the first real run past the selector fix failed with an H2 SQL error, `Value too long for column "PROFICIENCIES BINARY VARYING(255)"`, on the `CharacterStats` insert. `CharacterStatsEntity.proficiencies` (`HashMap<String, Short>`) had no `@Column`/`@Lob` annotation, so Hibernate defaulted it to a 255-byte serialized column — and Java's `HashMap` serialization overhead alone exceeds 255 bytes once any entries are present (every class selection in `CreateCharacter.tsx` auto-populates saving-throw proficiencies via a `useEffect`, so this triggers on any real character creation, not an edge case). Fixed by adding `@Lob` to that one field in `backend/src/main/java/com/utn/javaproject/dndsheets/domain/entities/CharacterStatsEntity.java`, matching the exact same pattern already used for `DndClassEntity.levelCharacteristics`. This is a genuine pre-existing production bug (H2 test env; Postgres's unbounded `bytea` likely masked it there), not an E2E-testing-scope-only artifact — it was simply never exercised by any prior test (unit tests use mocked repositories; no prior test persisted a real `CharacterStats` row with proficiencies through a live H2 insert). Scoped to one field, one annotation; did not touch `abilityScores` (same shape, but never observed to fail — no evidence to justify touching it). Re-ran `CreateCharacterIT` after this fix: green (1/1). Re-ran the full `mvn test` suite afterward: still 137/137, confirming the schema change didn't regress anything else.

### 3.3 (RED) / 3.4 (GREEN) — `DeleteCharacterIT`

- **3.3 RED**: `DeleteCharacterIT.java` created — registers, creates a campaign + character (via the two shared harness helpers, now both green), asserts the character card is present, clicks `character-card-delete`, then waits for `delete-character-modal`. To keep this RED genuine, the `delete-character-modal`/`delete-character-confirm`/`delete-character-cancel` testids that had been added to `App.tsx` alongside the join-code-modal work (Modal component threading, done together in one edit pass before this task was reached) were **temporarily reverted**, the frontend rebuilt, and the test re-run — confirmed `TimeoutException` waiting for `[data-testid='delete-character-modal']`, with the campaign/character setup steps preceding it having already succeeded. This is called out explicitly because it was a real process deviation (testids were originally added out of RED/GREEN order) and reverting+re-testing was necessary to preserve a truthful TDD Cycle Evidence table below.
- **3.4 GREEN**: re-added the `delete-character-modal` (`Modal`'s `testId` prop), `delete-character-confirm`, and `delete-character-cancel` `data-testid`s to `frontend/src/App.tsx`'s delete-character dialog. Re-ran `DeleteCharacterIT`: green (1/1).

### 3.7 — Full E2E suite + regression check

- `mvn -Pe2e verify` (no `-Dit.test` filter, all 5 `*IT` classes): **5/5 pass** — `AuthFlowIT`, `HomeDashboardIT`, `CreateCampaignIT`, `CreateCharacterIT`, `DeleteCharacterIT`.
- `mvn test` (no profile): **137/137**, same count as the PR2 baseline — no `*IT` class picked up, confirming Failsafe's profile scoping still holds after Phase 3's additions and the `CharacterStatsEntity` fix.
- `npx vitest run` (frontend): **297/297** across 22 files — no regression from the Phase 3 `data-testid`/`Modal testId` additions.

---

## Phase 4 — CI Workflow + Regression Guard (PR 3) — DONE

- **4.1**: created `.github/workflows/e2e.yml` — `on: push`/`pull_request` to `main`; `checkout` → `setup-java@v4` (temurin 21, maven cache) → `setup-node@v4` (npm cache) → `npm ci` (frontend) → `npm run build` with `VITE_API_BASE_URL=http://localhost:18080` → `npx vite preview --port 4173 --strictPort &` → poll-wait loop for `:4173` (`curl -sf`, up to 30s) → `google-chrome --version` (confirms Selenium Manager will find a matching driver) → `./mvnw -B verify -Pe2e` (from `backend/`) → `actions/upload-artifact@v4` for `backend/target/failsafe-reports/` on failure only.
- **4.2**: verified via `grep -n "needs:" .github/workflows/e2e.yml` (only a prose comment contains the word — no actual job dependency) and `grep -n "e2e" .github/workflows/deploy-backend.yml .github/workflows/deploy-frontend.yml` (no matches in either). The three workflows are fully independent.
- **4.3**: the regression guard (`mvn test` excludes every `*IT` class) was already documented as a `pom.xml` `<profiles>` comment in Phase 1 (`"Never active for plain mvn test/mvn verify; only Failsafe ... runs here"`); reinforced this session with a new root `README.md` "End-to-end tests" section stating the same guarantee explicitly and linking it to the profile mechanism.

## Phase 5 — Cleanup — DONE

- **5.1**: added an "End-to-end tests" section to root `README.md` (after "Available commands") with the `./mvnw verify -Pe2e` local run instructions, the exact two-origin prerequisite (`:18080` backend — self-booted by the suite; `:4173` frontend — built and served with `vite preview` beforehand), and a cross-reference to the CI workflow's independence from the deploy workflows. Also added a row to the existing backend commands table (`./mvnw verify -Pe2e`).
- **5.2**: see the "5.2 finding" note under Phase 3 above — campaign creation is a hard prerequisite for character creation; resolved via the shared `createCampaignAndGetJoinCode` harness helper rather than a design change.

---

## TDD Cycle Evidence (Phase 3, this session)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|--------------|----------|
| 3.5 | `CreateCampaignIT.java` | E2E (Selenium + real backend) | ✅ 137/137 (`mvn test`) unaffected before starting | ✅ Written, confirmed `TimeoutException` on `create-campaign-form` | ✅ Passed (1/1) after `CreateCampaign.tsx`/`App.tsx` testids | ➖ Single scenario (one journey per spec.md) | ➖ None needed — minimal testid additions only |
| 3.6 | (same file, GREEN step) | E2E | — | — | ✅ Passed | — | — |
| 3.1 | `CreateCharacterIT.java` | E2E (Selenium + real backend) | ✅ Campaign flow (3.5/3.6) already green before this RED | ✅ Written, confirmed `TimeoutException` on `create-character-form` (campaign setup succeeded first) | ✅ Passed (1/1) after `CreateCharacter.tsx`/`CharacterCard.tsx` testids + `CharacterStatsEntity` `@Lob` fix | ➖ Single scenario | ➖ None needed |
| 3.2 | (same file, GREEN step) | E2E | — | — | ✅ Passed | — | — |
| 3.3 | `DeleteCharacterIT.java` | E2E (Selenium + real backend) | ✅ Character-creation helper (3.1/3.2) already green before this RED | ✅ Written; pre-existing testids reverted first to force a genuine failure, then confirmed `TimeoutException` on `delete-character-modal` | ✅ Passed (1/1) after re-adding `App.tsx` delete-modal testids | ➖ Single scenario | ➖ None needed |
| 3.4 | (same file, GREEN step) | E2E | — | — | ✅ Passed | — | — |
| 3.7 | Full suite | E2E | ✅ 137/137 unit tests re-verified after `CharacterStatsEntity` change | N/A (verification task, not new code) | ✅ 5/5 `*IT` classes green together | N/A | N/A |

### Test Summary

- **Total E2E test classes**: 5 (`AuthFlowIT`, `HomeDashboardIT` from PR2; `CreateCampaignIT`, `CreateCharacterIT`, `DeleteCharacterIT` from this session).
- **Total E2E tests passing**: 5/5 (one `@Test` method per class).
- **Layers used**: E2E (5) — no unit/integration layer was applicable per design.md's "Choosing Test Layer" guidance (full user journeys, cross-page navigation, real backend).
- **Approval tests** (refactoring): None — no refactoring tasks in Phase 3-5.
- **Pure functions created**: None — this phase only added test infrastructure, `data-testid` markers, and one entity annotation fix.

## Work Unit Evidence (Phase 3-5, this session)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `cd backend && JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw -Pe2e verify -Dit.test=CreateCampaignIT,CreateCharacterIT,DeleteCharacterIT` → 3/3 pass |
| Runtime harness command/scenario and exact result | `cd backend && JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw -Pe2e verify` (full 5-class suite, real headless Chromium 151 run against a `vite preview` origin on `:4173` and the suite's self-booted backend on `:18080`) → 5/5 pass |
| Rollback boundary | Delete `CreateCharacterIT.java`, `DeleteCharacterIT.java`, `CreateCampaignIT.java`, `.github/workflows/e2e.yml`; revert the `data-testid`/`testId` additions in `CreateCharacter.tsx`, `CharacterCard.tsx`, `CreateCampaign.tsx`, `App.tsx`, `Modal.tsx`; revert `createCampaignAndGetJoinCode`/`createCharacter`/`byId` from `E2EBaseTest.java`; revert the `@Lob` annotation and its comment from `CharacterStatsEntity.java`; revert the README "End-to-end tests" section. No migration — purely additive per design.md, all changes independently revertible without touching Phase 1/2 (PR1/PR2) work. |

### Real local verification harness used for this session (not committed, ephemeral)

- Same as Phase 2: `chromium-browser` (Chromium 151, matching ChromeDriver via Selenium Manager), `JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk` for all `./mvnw` invocations.
- Frontend rebuilt with `VITE_API_BASE_URL=http://localhost:18080 npm run build` and served via `npx vite preview --port 4173 --strictPort` (backgrounded) before every RED/GREEN cycle; rebuilt again after each testid addition/reversion.
- All local verification processes (`vite preview`, chromium) were stopped/cleaned up before ending the session; nothing left running.

## Notes for continuation / follow-up

- Nothing remains from tasks.md — Phases 1 through 5 (all of PR1, PR2, PR3) are complete.
- The `CharacterStatsEntity.proficiencies` `@Lob` fix is a real production bug fix discovered via E2E testing; it is in scope for this PR (backend production code, minimal, evidenced) but is **not** listed in design.md's original "File Changes" table — flagged here as a deviation for `sdd-verify` to review.
- `abilityScores` on the same entity has the identical shape (`HashMap<String, Short>`, no `@Lob`) and is a plausible latent risk of the same class, but was never observed to fail in this session's runs — left untouched per "fix only what's evidenced."
