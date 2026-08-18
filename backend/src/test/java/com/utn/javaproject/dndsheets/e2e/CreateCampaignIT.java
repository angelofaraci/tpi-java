package com.utn.javaproject.dndsheets.e2e;

import com.utn.javaproject.dndsheets.e2e.support.E2EBaseTest;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Registers, creates a campaign through the create-campaign form, and verifies the
 * new campaign is reflected on the home dashboard's campaigns rail.
 */
class CreateCampaignIT extends E2EBaseTest {

    @Test
    void createsCampaignAndDisplaysItOnHome() {
        registerAndLogin(uniqueUsername());

        String campaignName = "Curse of the Crimson Keep " + uniqueUsername();
        String joinCode = createCampaignAndGetJoinCode(campaignName);

        assertThat(joinCode).isNotBlank();

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='home-rail-list']")));
        assertThat(testId("home-rail-list").getText()).contains(campaignName);
    }
}
