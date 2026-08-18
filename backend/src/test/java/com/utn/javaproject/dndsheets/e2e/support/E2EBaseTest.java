package com.utn.javaproject.dndsheets.e2e.support;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.time.Duration;
import java.util.UUID;

/**
 * Shared harness for browser-driven E2E journeys.
 *
 * <p>Boots the full Spring context on the fixed {@code e2e} profile port
 * (18080, see {@code application-e2e.properties}) and drives a pre-built
 * {@code vite preview} frontend origin (default {@code http://localhost:4173},
 * overridable via the {@code e2e.frontend.url} system property) with headless
 * Chrome. Process orchestration for the frontend build/preview lives outside
 * the JVM (CI workflow / local script) -- this harness only drives the
 * browser and the backend context, never spawns a subprocess.
 *
 * <p>Concrete {@code *IT} classes extend this class and use {@link #testId}
 * for all element lookups -- the frontend has no router, so navigation is
 * click-through and every selector MUST be a {@code data-testid} attribute
 * (never text content or DOM position).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@ActiveProfiles("e2e")
public abstract class E2EBaseTest {

    protected static final String FRONTEND_URL =
            System.getProperty("e2e.frontend.url", "http://localhost:4173");

    @LocalServerPort
    protected int backendPort;

    protected WebDriver driver;
    protected WebDriverWait wait;

    @BeforeEach
    void startBrowser() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments(
                "--headless=new",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--window-size=1440,900");
        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    @AfterEach
    void stopBrowser() {
        if (driver != null) {
            driver.quit();
        }
    }

    /**
     * Generates a short, collision-resistant username/email fragment for
     * per-test data isolation against the unique username/email constraints.
     */
    protected String uniqueUsername() {
        return "e2e_" + UUID.randomUUID().toString().substring(0, 8);
    }

    /**
     * Shared arrangement: registers a fresh unique user through the register
     * form. The backend's {@code /register} endpoint returns a JWT (see
     * {@code AuthService.register}), so registering auto-authenticates the
     * user -- there is no separate login step in this flow. Leaves the
     * browser on the authenticated home dashboard.
     */
    protected void registerAndLogin(String username) {
        driver.get(FRONTEND_URL);

        // The app boots on the unauthenticated demo landing page; navigate into
        // the auth flow before the login form exists in the DOM.
        wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='demo-login-request']")))
                .click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='login-form']")));
        testId("show-register").click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='register-form']")));
        testId("register-email").sendKeys(username + "@example.com");
        testId("register-username").sendKeys(username);
        testId("register-password").sendKeys("Password123!");
        testId("register-confirm").sendKeys("Password123!");
        testId("register-submit").click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='home-dashboard']")));
    }

    /** Locates an element by its {@code data-testid} attribute. */
    protected WebElement testId(String id) {
        return driver.findElement(By.cssSelector("[data-testid='" + id + "']"));
    }

    /**
     * Locates an element by its plain HTML {@code id} attribute. Several forms
     * (character creation, campaign creation) predate this E2E suite and already
     * carry stable {@code id}s -- those are reused as-is per design.md rather than
     * duplicated as {@code data-testid}s.
     */
    protected WebElement byId(String id) {
        return driver.findElement(By.id(id));
    }

    /**
     * Shared arrangement: creates a campaign from the authenticated home dashboard
     * via the UI, captures its join code from the post-creation modal, and returns
     * to home. Character creation requires an existing campaign (its join code is a
     * required field, see {@code CreateCharacter.validateForm}), so this is a
     * prerequisite step for character-creation flows, not just campaign-flow tests.
     */
    protected String createCampaignAndGetJoinCode(String campaignName) {
        testId("home-new-campaign").click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='create-campaign-form']")));

        byId("campaign-name").sendKeys(campaignName);
        testId("create-campaign-submit").click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='join-code-modal']")));
        String joinCode = testId("join-code-value").getText().trim();
        testId("join-code-dismiss").click();
        wait.until(ExpectedConditions.invisibilityOfElementLocated(By.cssSelector("[data-testid='join-code-modal']")));

        return joinCode;
    }

    /**
     * Shared arrangement: creates a character on an existing campaign (identified by
     * its join code) from the authenticated home dashboard via the UI, and waits for
     * the round trip back to the home dashboard. Picks the first available race and
     * class from the seeded catalog and a canonical alignment -- the exact choice is
     * irrelevant to the flows that use this as setup.
     */
    protected void createCharacter(String characterName, String joinCode) {
        testId("home-new-character").click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='create-character-form']")));

        byId("character-campaign-code").sendKeys(joinCode);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='character-campaign-code-valid']")));

        byId("character-name").sendKeys(characterName);
        new Select(byId("character-alignment")).selectByIndex(1);
        byId("character-background").sendKeys("Soldier");
        new Select(byId("character-race")).selectByIndex(1);
        new Select(byId("character-class")).selectByIndex(1);

        testId("create-character-submit").click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='home-dashboard']")));
    }
}
