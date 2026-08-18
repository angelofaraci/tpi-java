# Proposal: Selenium WebDriver E2E Testing Layer

## Intent

The project has no E2E layer (`openspec/config.yaml` → `testing.layers.e2e.available: false`). Backend coverage is 26 MockMvc tests that never boot a real HTTP listener; frontend coverage is vitest component tests. Nothing today proves that a real browser, hitting a real served frontend build against a real backend port, can complete a user journey end to end. Both CI workflows deploy straight to production with no staging environment, so full-stack regressions (CORS, JWT over a real network round-trip, cross-origin `VITE_API_BASE_URL` wiring) are only discovered in prod.

## Scope

### In Scope
- `selenium-java` + JUnit 5 in an **isolated Maven profile** so default `mvn test` stays unaffected; Selenium Manager resolves drivers (no webdrivermanager, Selenium 4.6+).
- Test harness booting `@SpringBootTest(webEnvironment = RANDOM_PORT)` backend plus a served frontend production build (`vite preview`) pointed at that port.
- Initial (non-exhaustive) flow coverage: **register + login**, **home dashboard load**, **create character**, **delete character**, **create campaign**.
- A new dedicated, **non-blocking** GitHub Actions workflow running headless Chrome.

### Out of Scope
- Blocking CI gate — the suite MUST NOT gate `deploy-backend.yml` or `deploy-frontend.yml` (user-confirmed; promotion is a future follow-up).
- Cross-browser matrix (Firefox/Safari/Edge), visual regression, Playwright.
- Campaign join-by-code, admin panel, view-campaign, read-only character view.
- Refactoring `App.tsx` to add React Router.

## Capabilities

### New Capabilities
- `e2e-testing`: browser-driven end-to-end verification of user journeys across a live backend and served frontend build.

### Modified Capabilities
- None.

## Approach

Exploration Approach 1. Backend owns the harness (Maven profile `e2e`, tests under `backend/src/test/java/.../e2e/`). Because there is no React Router, navigation is click-through only — selectors must be stable (`data-testid`), not text- or DOM-position-based. Two-origin coordination is explicit: backend port injected into the frontend build/preview at test setup.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/pom.xml` | Modified | `selenium-java` dep + `e2e` profile |
| `backend/src/test/java/.../e2e/` | New | Selenium test classes + base harness |
| `frontend/src/**` | Modified | `data-testid` hooks on flow-critical elements |
| `.github/workflows/e2e.yml` | New | Dedicated non-blocking workflow |
| `openspec/config.yaml` | Modified | `testing.layers.e2e.available: true` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Selenium Manager driver-fetch flakiness | Med | Non-blocking workflow; explicit waits |
| No router → brittle click-through nav | High | `data-testid` selectors only |
| RANDOM_PORT boot untested (CORS/JWT) | Med | First E2E task validates auth round-trip |
| Slower CI wall-clock | Low | Isolated profile + separate workflow |
| Test data leaking between runs | Med | H2 per-run; unique generated usernames |

## Rollback Plan

Delete `.github/workflows/e2e.yml`, remove the `e2e` Maven profile and `selenium-java` dep from `backend/pom.xml`, delete `backend/src/test/java/.../e2e/`, revert `config.yaml`. `data-testid` attributes are inert and may stay. No production code, schema, or deploy path is touched, so rollback is fully additive-reversal.

## Dependencies

- Chrome/Chromium available on the runner (`ubuntu-latest` preinstalls it).
- Network access at test time for Selenium Manager driver resolution.

## Success Criteria

- [ ] `mvn test` runtime and result set unchanged (E2E excluded by default).
- [ ] `mvn verify -Pe2e` runs the 5 flows green locally.
- [ ] Dedicated workflow runs on push/PR and reports status without gating either deploy workflow.
- [ ] `testing.layers.e2e.available: true` in `openspec/config.yaml`.
