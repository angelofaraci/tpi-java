package com.utn.javaproject.dndsheets.e2e.support;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
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
}
