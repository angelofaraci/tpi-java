# Tasks: Selenium WebDriver E2E Testing Layer

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650-750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 -> PR 2 -> PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (ask user) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Harness: pom.xml e2e profile, application-e2e.properties, E2EBaseTest, config.yaml flag | PR 1 | `cd backend && mvn -q -Pe2e validate` | N/A (no runnable test yet, harness compiles only) | Delete `e2e` profile block, `application-e2e.properties`, `e2e/support/` |
| 2 | AuthFlowIT + HomeDashboardIT + matching data-testid additions (Login.tsx, Home.tsx) | PR 2 | `cd backend && mvn -Pe2e verify -Dit.test=AuthFlowIT,HomeDashboardIT` | `cd backend && mvn -Pe2e verify -Dit.test=AuthFlowIT,HomeDashboardIT` (real headless Chrome run) | Delete `AuthFlowIT.java`, `HomeDashboardIT.java`, revert Login.tsx/Home.tsx testid adds |
| 3 | CreateCharacterIT + DeleteCharacterIT + CreateCampaignIT + remaining data-testid + CI workflow | PR 3 | `cd backend && mvn -Pe2e verify -Dit.test=CreateCharacterIT,DeleteCharacterIT,CreateCampaignIT` | `cd backend && mvn -Pe2e verify` (full suite, real headless Chrome run) | Delete the 3 IT classes, revert remaining testid adds, delete `.github/workflows/e2e.yml` |

## Phase 1: Harness Foundation (PR 1)

- [x] 1.1 `backend/pom.xml`: add `e2e` Maven profile with `selenium-java` (test scope) dependency and `maven-failsafe-plugin` (`integration-test`/`verify` goals) scoped to `<includes>**/e2e/*IT.java</includes>`.
- [x] 1.2 Confirm `selenium.version` is managed by `spring-boot-dependencies` 3.5.3; if absent, pin `4.27.0` explicitly in the profile.
- [x] 1.3 Create `backend/src/test/resources/application-e2e.properties`: `server.port=18080`, `app.cors.allowed-origins=http://localhost:4173,http://127.0.0.1:4173`.
- [x] 1.4 Create `backend/src/test/java/com/utn/javaproject/dndsheets/e2e/support/E2EBaseTest.java`: `@SpringBootTest(webEnvironment = DEFINED_PORT)`, `@ActiveProfiles("e2e")`, `FRONTEND_URL` system property (default `http://localhost:4173`), `@LocalServerPort backendPort`, headless `ChromeOptions` (`--headless=new`, `--no-sandbox`, `--disable-dev-shm-usage`, `--window-size=1440,900`), `@BeforeEach startBrowser()` / `@AfterEach stopBrowser()` (`driver.quit()`), `WebDriverWait` (15s), `uniqueUsername()`, `registerAndLogin(String)`, `testId(String)` helper (`By.cssSelector("[data-testid='...']")`).
- [x] 1.5 Update `openspec/config.yaml`: set `testing.layers.e2e.available: true` (and `tool: selenium`).
- [x] 1.6 Verify `mvn test` (no profile) still runs exactly the pre-existing 26 MockMvc tests and skips everything under `e2e/`.

## Phase 2: Auth + Dashboard Flows (PR 2, TDD)

- [x] 2.1 RED: write `backend/src/test/java/.../e2e/AuthFlowIT.java` — register with `uniqueUsername()`, then log in via `data-testid` selectors (`register-form`, `register-username`, ..., `login-form`, `login-submit`), assert `home-dashboard` element present. Run `mvn -Pe2e verify -Dit.test=AuthFlowIT`; confirm it fails on missing `data-testid` selectors (not on backend logic).
- [x] 2.2 GREEN: add `data-testid` attributes to `frontend/src/pages/Login.tsx` (`login-form`, `login-username`, `login-password`, `login-submit`, `login-error`, `show-register`, `register-form`, `register-email`, `register-username`, `register-password`, `register-confirm`, `register-submit`, `show-login`) and confirm/add `data-testid="home-dashboard"` on the authenticated `Home.tsx` (or `App.tsx`) root. Re-run `mvn -Pe2e verify -Dit.test=AuthFlowIT` until green.
- [x] 2.3 RED: write `backend/src/test/java/.../e2e/HomeDashboardIT.java` — reuse `registerAndLogin`, assert characters-list and campaigns-list `data-testid` elements are present in the DOM. Run and confirm it fails on missing selectors.
- [x] 2.4 GREEN: add `data-testid` attributes to `frontend/src/pages/Home.tsx` (`home-root`, `home-welcome`, `home-new-character`, `home-new-campaign`, `home-logout`, `home-characters-count`, `home-campaigns-count`; reuse existing `home-metrics-grid`, `home-body-grid`, `home-rail-list`). Re-run `mvn -Pe2e verify -Dit.test=HomeDashboardIT` until green.
- [x] 2.5 Run both together: `mvn -Pe2e verify -Dit.test=AuthFlowIT,HomeDashboardIT`; confirm green and confirm plain `mvn test` is still unaffected.

## Phase 3: Character + Campaign Flows (PR 3, TDD)

- [ ] 3.1 RED: write `backend/src/test/java/.../e2e/CreateCharacterIT.java` — authenticated session navigates to create-character screen, fills required fields via `data-testid`/reused `id`s (`character-name`, `character-race`, `character-alignment`, `character-background`), submits, asserts navigation to home and new character visible in `character-card` list. Run and confirm it fails on missing selectors.
- [ ] 3.2 GREEN: add `data-testid` to `frontend/src/pages/CreateCharacter.tsx` (`create-character-form`, `create-character-submit`, `create-character-cancel`, `create-character-error`) and to `frontend/src/components/CharacterCard.tsx` (`character-card`, `character-card-name`, `character-card-delete`). Re-run `CreateCharacterIT` until green.
- [ ] 3.3 RED: write `backend/src/test/java/.../e2e/DeleteCharacterIT.java` — authenticated session with one owned character on home, click `character-card-delete`, confirm via `delete-character-modal`/`delete-character-confirm`, assert card no longer present. Run and confirm it fails on missing selectors.
- [ ] 3.4 GREEN: add `data-testid` to `frontend/src/App.tsx` modal markup (`delete-character-modal`, `delete-character-confirm`, `delete-character-cancel`). Re-run `DeleteCharacterIT` until green.
- [ ] 3.5 RED: write `backend/src/test/java/.../e2e/CreateCampaignIT.java` — authenticated session navigates to create-campaign screen, fills required fields via `data-testid`/reused `id`s (`campaign-name`, `campaign-description`, `campaign-privacy`), submits, asserts navigation to home and new campaign visible in campaigns list (and dismisses `join-code-modal` if raised). Run and confirm it fails on missing selectors.
- [ ] 3.6 GREEN: add `data-testid` to `frontend/src/pages/CreateCampaign.tsx` (`create-campaign-form`, `create-campaign-submit`, `create-campaign-cancel`, `create-campaign-error`) and to `frontend/src/App.tsx` (`join-code-modal`, `join-code-value`, `join-code-dismiss`). Re-run `CreateCampaignIT` until green.
- [ ] 3.7 Run the full E2E suite: `mvn -Pe2e verify`; confirm all 5 `*IT` classes pass and `mvn test` still reports only the original 26 tests.

## Phase 4: CI Workflow + Regression Guard (PR 3)

- [ ] 4.1 Create `.github/workflows/e2e.yml`: `on: push`/`pull_request` to `main`; steps `checkout` -> `setup-java@v4` (temurin 21, maven cache) -> `setup-node@v4` (npm cache) -> `npm ci` -> build frontend with `VITE_API_BASE_URL=http://localhost:18080` -> `npx vite preview --port 4173 --strictPort &` -> wait for `:4173` -> `google-chrome --version` -> `./mvnw -B verify -Pe2e` -> upload failure screenshots as artifact.
- [ ] 4.2 Confirm the new workflow has no `needs:` relation to `deploy-backend.yml` or `deploy-frontend.yml`, and neither deploy workflow references `e2e.yml`.
- [ ] 4.3 Add/confirm a regression assertion (CI step or doc note) that `mvn test` output excludes every `*IT` class, matching the "Isolated Maven Profile" and "Non-Blocking CI Workflow" spec scenarios.

## Phase 5: Cleanup

- [ ] 5.1 Update root/backend README or CI docs with the `mvn verify -Pe2e` local run instructions and the two-origin (`:18080`/`:4173`) prerequisite.
- [ ] 5.2 Resolve the design's open question on `CreateCharacterIT`/campaign coupling: confirm campaign creation is not a hard prerequisite for character creation, or add the minimal setup step if it is.
