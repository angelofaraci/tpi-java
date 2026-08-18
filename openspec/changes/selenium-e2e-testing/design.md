# Design: Selenium WebDriver E2E Testing Layer

## Technical Approach

Backend owns the harness. A Maven profile `e2e` activates **Failsafe** (never Surefire) over `**/e2e/*IT.java`; Selenium 4.x resolves ChromeDriver via Selenium Manager. Tests boot the app on a **fixed** port and drive a pre-built `vite preview` origin. Process orchestration (frontend build + preview) lives in the CI workflow / a local script, not in Java — the JVM never spawns a subprocess.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Runner isolation | `e2e` profile declares `maven-failsafe-plugin` with `<includes>**/e2e/*IT.java</includes>`; class names end in `IT` | Surefire `groups`/`excludedGroups`; `*E2ETest` naming | Surefire's default includes are `Test*`, `*Test`, `*Tests`, `*TestCase` — an `IT` suffix is structurally invisible to `mvn test`. A `*E2ETest` name would be picked up by default and break the "unchanged `mvn test`" criterion. Failsafe only exists inside the profile, so plain `mvn verify` is also unaffected. The include is scoped to `**/e2e/` so the pre-existing (currently dormant) `DemoControllerIT` is not silently activated. |
| Selenium version | `org.seleniumhq.selenium:selenium-java`, version inherited from the `spring-boot-starter-parent` 3.5.3 BOM (`selenium.version`, 4.x ≥ 4.6) | `webdrivermanager`; hard pin | Selenium ≥ 4.6 ships Selenium Manager, so no driver dependency is needed. If `mvn dependency:tree` shows it unmanaged, pin `4.27.0` explicitly. |
| Backend port | **Fixed** `server.port=18080` via `@SpringBootTest(webEnvironment = DEFINED_PORT)` + `@ActiveProfiles("e2e")` | `RANDOM_PORT` | Vite bakes `VITE_API_BASE_URL` at **build** time, and the frontend build must finish *before* the JVM starts. `RANDOM_PORT` is only knowable after boot, which would force a second build or a runtime-config indirection. A fixed port makes the two origins statically known. `@LocalServerPort` still injects (and equals 18080), so the harness keeps one source of truth. |
| Frontend serving | CI/script: `VITE_API_BASE_URL=http://localhost:18080 npm run build` → `npm run preview -- --port 4173 --strictPort` | Harness `ProcessBuilder`; Spring static resource serving | Keeps process management declarative and out of test code; `--strictPort` fails loudly instead of silently drifting. |
| CORS | `application-e2e.properties` sets `app.cors.allowed-origins=http://localhost:4173,http://127.0.0.1:4173` | Reuse the 5173 test value | The existing test properties only allow the Vite **dev** port; preview is 4173, so the round-trip would fail CORS. |
| Data isolation | H2 in-memory `create-drop` per JVM run (existing pattern) + per-test `e2e_<8 hex of UUID>` usernames/emails | Shared seeded fixture | Removes cross-test and cross-run collisions on the unique username/email constraint. |

## Data Flow

    npm run build (VITE_API_BASE_URL=:18080)
              │
              ▼
    vite preview :4173 ──► ChromeDriver (headless) ──► DOM (data-testid)
              │                                             │
              └────────── fetch + JWT ──► Spring Boot :18080 ──► H2 in-mem

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/pom.xml` | Modify | `e2e` profile: `selenium-java` (test scope) + `maven-failsafe-plugin` with `integration-test`/`verify` goals |
| `backend/src/test/resources/application-e2e.properties` | Create | `server.port=18080`, preview-origin CORS |
| `backend/src/test/java/.../e2e/support/E2EBaseTest.java` | Create | Abstract harness (see below) |
| `backend/src/test/java/.../e2e/AuthFlowIT.java` | Create | Register + login |
| `backend/src/test/java/.../e2e/HomeDashboardIT.java` | Create | Dashboard loads post-login |
| `backend/src/test/java/.../e2e/CreateCharacterIT.java` | Create | Character creation |
| `backend/src/test/java/.../e2e/DeleteCharacterIT.java` | Create | Delete + confirm modal |
| `backend/src/test/java/.../e2e/CreateCampaignIT.java` | Create | Campaign creation + join-code modal |
| `frontend/src/pages/{Login,Home,CreateCharacter,CreateCampaign}.tsx`, `components/CharacterCard.tsx`, `App.tsx` | Modify | `data-testid` hooks |
| `.github/workflows/e2e.yml` | Create | Dedicated non-blocking workflow |
| `openspec/config.yaml` | Modify | `e2e: { available: true, tool: selenium }` |

## Interfaces / Contracts

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@ActiveProfiles("e2e")
public abstract class E2EBaseTest {
    protected static final String FRONTEND_URL = System.getProperty("e2e.frontend.url", "http://localhost:4173");
    @LocalServerPort protected int backendPort;   // == 18080
    protected WebDriver driver;
    protected WebDriverWait wait;                 // Duration.ofSeconds(15)

    @BeforeEach void startBrowser() { /* ChromeOptions: --headless=new,
        --no-sandbox, --disable-dev-shm-usage, --window-size=1440,900 */ }
    @AfterEach  void stopBrowser()  { /* driver.quit() */ }

    protected String uniqueUsername() { return "e2e_" + UUID.randomUUID().toString().substring(0, 8); }
    protected void registerAndLogin(String username);          // shared arrangement
    protected WebElement testId(String id);                    // By.cssSelector("[data-testid='...']")
}
```

Every interaction goes through `wait.until(ExpectedConditions...)` — no `Thread.sleep`, no text- or position-based selectors (there is no router; navigation is click-through).

### `data-testid` selectors to add

| File | Selectors |
|---|---|
| `Login.tsx` | `login-form`, `login-username`, `login-password`, `login-submit`, `login-error`, `show-register`, `register-form`, `register-email`, `register-username`, `register-password`, `register-confirm`, `register-submit`, `show-login` |
| `Home.tsx` | `home-root`, `home-welcome`, `home-new-character`, `home-new-campaign`, `home-logout`, `home-characters-count`, `home-campaigns-count` (reuses existing `home-metrics-grid`, `home-body-grid`, `home-rail-list`) |
| `CharacterCard.tsx` | `character-card`, `character-card-name`, `character-card-delete` (the `···` button) |
| `App.tsx` | `delete-character-modal`, `delete-character-confirm`, `delete-character-cancel`, `join-code-modal`, `join-code-value`, `join-code-dismiss` |
| `CreateCharacter.tsx` | `create-character-form`, `create-character-submit`, `create-character-cancel`, `create-character-error` (existing `id`s `character-name`, `character-race`, `character-alignment`, `character-background` are reused as-is) |
| `CreateCampaign.tsx` | `create-campaign-form`, `create-campaign-submit`, `create-campaign-cancel`, `create-campaign-error` (existing `id`s `campaign-name`, `campaign-description`, `campaign-privacy` reused) |

### `.github/workflows/e2e.yml`

Own workflow file, `on: push`/`pull_request` to `main`, no `needs:` relation to either deploy workflow (they never reference it, so a red run cannot gate deploys). Steps: `checkout` → `setup-java@v4` (temurin 21, maven cache) → `setup-node@v4` (npm cache) → `npm ci` → build frontend with `VITE_API_BASE_URL=http://localhost:18080` → `npx vite preview --port 4173 --strictPort &` → wait for `:4173` → verify Chrome present (`google-chrome --version`, preinstalled on `ubuntu-latest`) → `./mvnw -B verify -Pe2e` → upload failure screenshots as an artifact.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit / Integration | Unchanged | `mvn test` + vitest must stay green and same-count |
| E2E | 5 journeys | Failsafe + headless Chrome against the two live origins |
| Regression guard | Isolation | Assert `mvn test` output excludes every `*IT` class |

## Threat Matrix

N/A — no product routing, shell, subprocess, VCS/PR automation, or executable-file classification boundary. The JVM spawns no process; CI shell steps are declarative workflow configuration with no user-controlled argument composition.

## Migration / Rollout

No migration. Purely additive; rollback is deletion per the proposal's plan. `data-testid` attributes are inert.

## Open Questions

- [ ] Confirm `spring-boot-dependencies` 3.5.3 manages `selenium.version`; if not, pin `4.27.0`.
- [ ] Whether `CreateCharacterIT` needs an existing campaign (character↔campaign coupling) — resolve during task authoring.
