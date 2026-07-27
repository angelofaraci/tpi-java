package com.utn.javaproject.dndsheets.domain.dto;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PlayerCampaignSummaryDtoTest {

    @Test
    void playerCountAndCharacterCount_getterAndSetter_roundTrip() {
        PlayerCampaignSummaryDto dto = new PlayerCampaignSummaryDto();

        dto.setPlayerCount(5);
        dto.setCharacterCount(1);

        assertThat(dto.getPlayerCount()).isEqualTo(5);
        assertThat(dto.getCharacterCount()).isEqualTo(1);
    }
}
