package com.utn.javaproject.dndsheets.e2e;

import com.utn.javaproject.dndsheets.e2e.support.E2EBaseTest;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Registers, creates a campaign and an owned character (setup), then deletes that
 * character from the home dashboard via its card's delete control and the confirm
 * dialog, and asserts it no longer appears in the characters list.
 */
class DeleteCharacterIT extends E2EBaseTest {

    @Test
    void deletesOwnedCharacterFromHome() {
        registerAndLogin(uniqueUsername());
        String joinCode = createCampaignAndGetJoinCode("Ghosts of Saltmarsh " + uniqueUsername());
        String characterName = "Brenn " + uniqueUsername();
        createCharacter(characterName, joinCode);

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='character-card']")));
        assertThat(testId("character-card-name").getText()).isEqualTo(characterName);

        testId("character-card-delete").click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='delete-character-modal']")));
        testId("delete-character-confirm").click();

        wait.until(ExpectedConditions.invisibilityOfElementLocated(By.cssSelector("[data-testid='delete-character-modal']")));
        wait.until(ExpectedConditions.invisibilityOfElementLocated(By.cssSelector("[data-testid='character-card']")));
    }
}
