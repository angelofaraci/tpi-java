# E2E Testing Specification

## Purpose

Browser-driven Selenium/JUnit 5 verification of critical D&D Manager user journeys against a real backend port and a served frontend production build, isolated from the default test run and non-blocking in CI.

## Requirements

### Requirement: Isolated Maven Profile

The system MUST run E2E tests only under a dedicated Maven profile (`e2e`) and MUST NOT execute them as part of the default `mvn test`/`mvn verify` lifecycle.

#### Scenario: Default test run excludes E2E

- GIVEN the `backend` module with the `e2e` profile defined
- WHEN a developer runs `mvn test` without activating any profile
- THEN no Selenium E2E test class executes
- AND runtime/result count matches the pre-existing 26 MockMvc tests

#### Scenario: Explicit profile activation runs E2E

- GIVEN the `e2e` profile is defined with `selenium-java` on its classpath
- WHEN a developer runs `mvn verify -Pe2e`
- THEN all E2E test classes under `backend/src/test/java/.../e2e/` execute

### Requirement: Full-Stack Test Harness

The system MUST boot a real backend HTTP listener (`@SpringBootTest(webEnvironment = RANDOM_PORT)`) and a served frontend production build (`vite preview`), MUST wire the frontend to the backend's assigned port, and MUST tear down both after the suite.

#### Scenario: Harness coordinates two origins

- GIVEN the E2E suite is starting
- WHEN the Spring context boots on a random port
- THEN the frontend preview server is built/started with its API base URL pointing at that port
- AND Selenium WebDriver navigates to the frontend preview origin, not the backend origin

#### Scenario: Harness tears down cleanly

- GIVEN an E2E suite run has completed (pass or fail)
- WHEN the JUnit lifecycle finishes
- THEN the backend context and the frontend preview process are both stopped
- AND no leftover process holds the allocated ports

### Requirement: Register and Login Flow

The system MUST verify that a new user can register and then log in through the browser UI, receiving an authenticated session.

#### Scenario: New user registers and logs in

- GIVEN a served frontend pointed at a fresh backend instance
- WHEN a browser session submits a unique generated username/password on the registration form
- AND then submits the same credentials on the login form
- THEN the browser reaches the authenticated home dashboard
- AND a JWT-backed session is established (verified via a post-login authenticated element, e.g. `data-testid="home-dashboard"`)

### Requirement: Home Dashboard Load

The system MUST verify that an authenticated user's home dashboard loads its characters and campaigns data from the backend.

#### Scenario: Home renders after login

- GIVEN an authenticated browser session
- WHEN the home dashboard route is reached
- THEN elements marked with stable `data-testid` selectors for the characters list and campaigns list are present in the DOM

### Requirement: Create Character Flow

The system MUST verify a user can create a character via the UI and see it reflected on the home dashboard.

#### Scenario: Character creation persists and displays

- GIVEN an authenticated browser session on the create-character screen
- WHEN the user fills required fields and submits via `data-testid` selectors
- THEN the browser navigates back to home
- AND the newly created character appears in the characters list

### Requirement: Delete Character Flow

The system MUST verify a user can delete an owned character via the UI and see it removed from the dashboard.

#### Scenario: Character deletion removes it from home

- GIVEN an authenticated browser session with at least one owned character on home
- WHEN the user triggers delete on that character via its `data-testid` control and confirms
- THEN the character no longer appears in the characters list

### Requirement: Create Campaign Flow

The system MUST verify a user can create a campaign via the UI and see it reflected on the home dashboard.

#### Scenario: Campaign creation persists and displays

- GIVEN an authenticated browser session on the create-campaign screen
- WHEN the user fills required fields and submits via `data-testid` selectors
- THEN the browser navigates back to home
- AND the newly created campaign appears in the campaigns list

### Requirement: Stable Selector Strategy

Because the frontend has no router, all E2E navigation MUST use `data-testid` selectors rather than text content or DOM position.

#### Scenario: Selector resilience

- GIVEN a flow-critical interactive element (button, link, form field) touched by any of the five covered flows
- WHEN the E2E test locates that element
- THEN it MUST do so via a `data-testid` attribute
- AND MUST NOT rely on visible text or CSS structural position

### Requirement: Non-Blocking CI Workflow

The system MUST run the E2E suite in a dedicated GitHub Actions workflow on headless Chrome, and this workflow MUST NOT gate `deploy-backend.yml` or `deploy-frontend.yml`.

#### Scenario: E2E workflow runs independently of deploy gates

- GIVEN a push or pull request triggers CI
- WHEN the dedicated E2E workflow runs and fails
- THEN `deploy-backend.yml` and `deploy-frontend.yml` are still eligible to run/succeed independently
- AND the E2E workflow reports its own status check without blocking merge or deploy

#### Scenario: Driver resolution failure does not fail CI overall

- GIVEN Selenium Manager cannot resolve a Chrome driver on the runner
- WHEN the E2E workflow job fails for that reason
- THEN only the E2E workflow's own status is affected
