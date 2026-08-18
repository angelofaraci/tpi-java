package com.utn.javaproject.dndsheets.e2e;

import com.utn.javaproject.dndsheets.e2e.support.E2EBaseTest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies the authenticated home dashboard renders its key regions after a
 * fresh register + auto-login round trip -- welcome header, character/campaign
 * counts, and the primary creation actions.
 */
class HomeDashboardIT extends E2EBaseTest {

    @Test
    void dashboardShowsWelcomeAndCoreMetricsAfterLogin() {
        registerAndLogin(uniqueUsername());

        assertThat(testId("home-welcome").isDisplayed()).isTrue();
        assertThat(testId("home-new-character").isDisplayed()).isTrue();
        assertThat(testId("home-new-campaign").isDisplayed()).isTrue();
        assertThat(testId("home-logout").isDisplayed()).isTrue();
        assertThat(testId("home-characters-count").isDisplayed()).isTrue();
        assertThat(testId("home-campaigns-count").isDisplayed()).isTrue();
    }
}
