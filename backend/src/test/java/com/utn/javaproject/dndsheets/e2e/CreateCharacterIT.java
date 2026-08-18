package com.utn.javaproject.dndsheets.e2e;

import com.utn.javaproject.dndsheets.e2e.support.E2EBaseTest;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Registers, creates a prerequisite campaign (a valid join code is a required field
 * on the character creation form, see {@code CreateCharacter.validateForm}), then
 * creates a character through the create-character form and verifies it appears on
 * the home dashboard's characters list.
 */
class CreateCharacterIT extends E2EBaseTest {

    @Test
    void createsCharacterAndDisplaysItOnHome() {
        registerAndLogin(uniqueUsername());
        String joinCode = createCampaignAndGetJoinCode("Tomb of Annihilation " + uniqueUsername());

        testId("home-new-character").click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='create-character-form']")));

        byId("character-campaign-code").sendKeys(joinCode);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='character-campaign-code-valid']")));

        String characterName = "Elandriel " + uniqueUsername();
        byId("character-name").sendKeys(characterName);
        new Select(byId("character-alignment")).selectByIndex(1);
        byId("character-background").sendKeys("Soldier");
        new Select(byId("character-race")).selectByIndex(1);
        new Select(byId("character-class")).selectByIndex(1);

        testId("create-character-submit").click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='home-dashboard']")));

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='character-card']")));
        assertThat(testId("character-card-name").getText()).isEqualTo(characterName);
    }
}
