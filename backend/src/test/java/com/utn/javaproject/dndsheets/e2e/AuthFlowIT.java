package com.utn.javaproject.dndsheets.e2e;

import com.utn.javaproject.dndsheets.e2e.support.E2EBaseTest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Registers a brand-new user through the register form and asserts the
 * authenticated home dashboard is reached -- the full register (auto-login)
 * round trip against the live backend and pre-built frontend origins.
 */
class AuthFlowIT extends E2EBaseTest {

    @Test
    void registersAndReachesHomeDashboard() {
        String username = uniqueUsername();

        registerAndLogin(username);

        assertThat(testId("home-dashboard").isDisplayed()).isTrue();
    }
}
