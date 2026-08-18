# Verification Report: selenium-e2e-testing

**Date**: 2026-08-18
**Verifier**: sdd-verify (fresh context, independent)
**Scope**: Full change across 3 stacked branches (feat/selenium-e2e-harness -> feat/selenium-e2e-auth-home -> feat/selenium-e2e-character-campaign-ci), currently checked out on the tip branch, all commits present.

## 1. Task Completion (tasks.md)

All 23 checkboxes across Phases 1-5 are marked `[x]`. Spot-checked against actual files, not trusted from the checkmarks alone:

| Task | File(s) checked | Verdict |
|---|---|---|
| 1.1-1.2 | `backend/pom.xml` — `e2e` profile with `selenium-java` dep, `maven-failsafe-plugin` bound to `verify`, `<includes>**/e2e/*IT.java</includes>`, `<testExcludes>**/e2e/**</testExcludes>` on Surefire | PASS |
| 1.3 | `backend/src/test/resources/application-e2e.properties` — `server.port=18080`, `app.cors.allowed-origins=http://localhost:4173,http://127.0.0.1:4173` | PASS, exact match |
| 1.4 | `E2EBaseTest.java` — `@SpringBootTest(webEnvironment = DEFINED_PORT)`, `@ActiveProfiles("e2e")`, `FRONTEND_URL` sysprop, `@LocalServerPort`, headless ChromeOptions, `@BeforeEach`/`@AfterEach`, 15s `WebDriverWait`, `uniqueUsername()`, `registerAndLogin()`, `testId()` | PASS |
| 1.5 | `openspec/config.yaml` line 20: `e2e: { available: true, tool: selenium }` | PASS |
| 1.6 | Reproduced independently, see §2 | PASS |
| 2.1-2.5 | `AuthFlowIT.java`, `HomeDashboardIT.java`, `Login.tsx`/`Home.tsx` testids (13 occurrences each per `rg -c`) | PASS |
| 3.1-3.7 | `CreateCharacterIT.java`, `DeleteCharacterIT.java`, `CreateCampaignIT.java` all read in full; testids present in `CreateCharacter.tsx` (5), `CreateCampaign.tsx` (4), `CharacterCard.tsx` (5), `App.tsx` (4) | PASS |
| 4.1-4.3 | `.github/workflows/e2e.yml` read in full — matches described steps | PASS |
| 5.1-5.2 | README section and `createCampaignAndGetJoinCode` helper confirmed present in `E2EBaseTest.java` | PASS |

**Note (informational, not a defect)**: task 4.1 describes the failure-artifact upload as "screenshot", but the workflow (and codebase) uploads `backend/target/failsafe-reports/` — Failsafe XML/txt reports, not actual PNG screenshots (no screenshot-capture code exists anywhere in the harness). This is a wording imprecision in tasks.md's own paraphrase, not a gap between tasks.md and the code — treat as SUGGESTION only.

## 2. Spec Compliance (openspec/changes/selenium-e2e-testing/specs/e2e-testing/spec.md)

The spec.md actually defines **8 requirements / 10 scenarios**, not 5 — the "5 scenarios" in the task brief maps to the 5 `*IT` classes (one flow-level requirement each: Register/Login, Home Dashboard, Create Character, Delete Character, Create Campaign), plus 3 cross-cutting requirements (Isolated Maven Profile, Full-Stack Harness, Stable Selector Strategy, Non-Blocking CI) covered by the harness/profile/CI mechanics rather than a dedicated IT class each.

| Requirement | Scenario | Covering evidence | Status |
|---|---|---|---|
| Isolated Maven Profile | Default test run excludes E2E | `mvn test` run independently: 137/137, `BUILD SUCCESS`, no `e2e` string in output (§3) | PASS (runtime-verified) |
| Isolated Maven Profile | Explicit profile activation runs E2E | `mvn -Pe2e verify` run independently: 5/5 `*IT` classes executed (§4) | PASS (runtime-verified) |
| Full-Stack Test Harness | Harness coordinates two origins | `E2EBaseTest` boots Spring on fixed port 18080 (not `RANDOM_PORT` — see deviation below), frontend built with `VITE_API_BASE_URL=http://localhost:18080` and served on `:4173`; `registerAndLogin` navigates to `FRONTEND_URL` first | PASS, with a documented spec-text deviation (see below) |
| Full-Stack Test Harness | Harness tears down cleanly | `@AfterEach stopBrowser()` calls `driver.quit()`; Spring context lifecycle is managed by `@SpringBootTest`; no leftover `vite preview`/chromedriver process observed after this session's runs (`pgrep` confirmed clean) | PASS |
| Register and Login Flow | New user registers and logs in | `AuthFlowIT` — passed in independent run (53.36s incl. context boot) | PASS (runtime-verified) |
| Home Dashboard Load | Home renders after login | `HomeDashboardIT` — passed (2.90s) | PASS (runtime-verified) |
| Create Character Flow | Character creation persists and displays | `CreateCharacterIT` — passed (6.54s) | PASS (runtime-verified) |
| Delete Character Flow | Character deletion removes it from home | `DeleteCharacterIT` — passed (8.01s) | PASS (runtime-verified) |
| Create Campaign Flow | Campaign creation persists and displays | `CreateCampaignIT` — passed (4.81s) | PASS (runtime-verified) |
| Stable Selector Strategy | Selector resilience | All 5 IT classes use only `testId()`/`byId()` (data-testid / reused stable `id`) helpers for every locator; no `By.linkText`/`By.xpath` text-matching or CSS structural-position selectors found in any IT class or `E2EBaseTest` | PASS |
| Non-Blocking CI Workflow | E2E workflow runs independently of deploy gates | `.github/workflows/e2e.yml` has no `needs:` job dependency (only a prose comment mentions the word); `deploy-backend.yml`/`deploy-frontend.yml` grepped — zero `e2e` matches in either | PASS |
| Non-Blocking CI Workflow | Driver resolution failure does not fail CI overall | Structurally true by workflow isolation (separate job, separate workflow file, no gating relation); not independently re-provable without simulating a Selenium Manager failure, but the isolation mechanism satisfying it is verified | PASS (structural) |

### Deviation: `DEFINED_PORT` vs. spec text's `RANDOM_PORT`

`spec.md`'s "Full-Stack Test Harness" requirement literally names `@SpringBootTest(webEnvironment = RANDOM_PORT)`, but `E2EBaseTest.java:36` uses `DEFINED_PORT` with a fixed `server.port=18080`. This is **documented and justified in `design.md`** (line 13 of its Key Decisions table): Vite bakes `VITE_API_BASE_URL` at build time, before the JVM starts, so a random port discoverable only after boot would force a second frontend build or runtime-config indirection. The functional intent of the scenario ("frontend wired to the backend's assigned port, two origins coordinated") is still satisfied — just via a fixed, statically-known port rather than a dynamically-assigned one. This is a WARNING (spec.md's own literal wording was never updated to match the design decision), not a CRITICAL defect, since the design rationale is sound and openly disclosed in both `design.md` and `apply-progress.md`.

## 3. Independent Reproduction — `mvn test` (backend/, no profile)

```
cd backend && JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw test
```

- **Result**: `Tests run: 137, Failures: 0, Errors: 0, Skipped: 0` — `BUILD SUCCESS`.
- No `e2e` package, no `*IT` class name appears anywhere in the full log.
- Matches the 137/137 baseline claimed in `apply-progress.md` (which itself explains the historical 26 -> 137 growth was independent of this change).

## 4. Independent Reproduction — `mvn -Pe2e verify` (backend/, real headless Chrome)

Environment: Chromium 151.0.7922.137 (`/usr/sbin/chromium-browser`), Selenium Manager auto-resolved matching ChromeDriver, `JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk`.

Steps performed independently in this session:
1. `cd frontend && VITE_API_BASE_URL=http://localhost:18080 npm run build` — succeeded (`vite build`, 55 modules, `dist/` produced).
2. `cd frontend && npx vite preview --port 4173 --strictPort &` — confirmed up via `curl -sf http://localhost:4173`.
3. `cd backend && JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw -Pe2e verify` — full run, both unit tests and the 5 IT classes.

**Result**:
- Unit tests (Surefire, still runs under `verify`): `Tests run: 137, Failures: 0, Errors: 0, Skipped: 0`.
- Failsafe (`*IT` classes only):
  - `AuthFlowIT` — 1/1 passed, 53.36s
  - `CreateCampaignIT` — 1/1 passed, 4.81s
  - `CreateCharacterIT` — 1/1 passed, 6.54s
  - `DeleteCharacterIT` — 1/1 passed, 8.01s
  - `HomeDashboardIT` — 1/1 passed, 2.90s
  - Total: `Tests run: 5, Failures: 0, Errors: 0, Skipped: 0`
- `BUILD SUCCESS` overall.
- Preview server and Chromium processes cleaned up after the run (`pgrep -fa "vite preview"` confirmed no leftover process).

This reproduces the 5/5 result claimed in `apply-progress.md` on the actual final committed state of the tip branch — not a mid-session run.

## 5. CI Workflow Independence

- `.github/workflows/e2e.yml`: `grep -n "needs:"` → one match, a prose code-comment on line 4 (`"has no needs: relation to deploy-backend.yml..."`), not an actual YAML `needs:` key. Confirmed by reading the full file — the `e2e` job has no `needs:` field.
- `grep -n "e2e" .github/workflows/deploy-backend.yml .github/workflows/deploy-frontend.yml` → zero matches in either file.
- **Conclusion**: the three workflows are structurally independent; a failing `e2e.yml` run cannot block `deploy-backend.yml`/`deploy-frontend.yml`. PASS.

## 6. `openspec/config.yaml`

Line 20: `e2e: { available: true, tool: selenium }`. Matches task 1.5's claim exactly. PASS.

## Issues

### CRITICAL
None.

### WARNING
1. `spec.md`'s "Full-Stack Test Harness" requirement text still says `RANDOM_PORT`, but the shipped implementation uses `DEFINED_PORT` (fixed port 18080). The deviation is justified and documented in `design.md` and `apply-progress.md`, and the underlying scenario intent (two coordinated origins, clean teardown) is still met — but `spec.md` itself was never amended to reflect the accepted design decision. Recommend a follow-up edit to `spec.md`'s "Harness coordinates two origins" scenario language before this change is archived, so the spec doesn't read as contradicted by its own implementation.

### SUGGESTION
1. Task 4.1's own paraphrase ("upload failure screenshots as artifact") describes the CI artifact upload as screenshots; the actual artifact is `backend/target/failsafe-reports/` (Failsafe XML/txt reports). No screenshot-capture code exists in the harness. Purely a documentation wording nit inside tasks.md — the workflow itself is correct and does what `apply-progress.md` describes.
2. The `CharacterStatsEntity.proficiencies` `@Lob` fix (a genuine pre-existing production bug found and fixed during Phase 3, per `apply-progress.md`) was not added to `design.md`'s original "File Changes" table. It is scoped, evidenced, and low-risk, but for full design-doc/code coherence a follow-up note in `design.md` would close the loop. `apply-progress.md` already flags this itself for `sdd-verify` review — this report confirms the fix is real (found in `CharacterStatsEntity.java`) and scoped to exactly one field/annotation as claimed.

## Final Verdict

**PASS WITH WARNINGS**

All 23 tasks are complete and match the actual code. All 10 spec scenarios (across 8 requirements) are satisfied by runtime-verified evidence from this session's independent test runs, not trusted from prior claims. `mvn test` (137/137) is unaffected by the e2e layer. `mvn -Pe2e verify` passes 5/5 IT classes against a real headless Chromium build of the final committed state. The CI workflow is structurally non-blocking relative to both deploy workflows. `openspec/config.yaml` correctly reflects `e2e` layer availability. The only issues found are one WARNING (spec.md's literal `RANDOM_PORT` wording not updated to match an openly-documented, justified `DEFINED_PORT` design decision) and two SUGGESTIONs (a tasks.md wording nit, and a design.md file-changes-table gap for an already-disclosed, in-scope production bug fix). None of these block archiving the change, but the spec.md wording WARNING should ideally be resolved first so the spec doesn't read as self-contradicting.
