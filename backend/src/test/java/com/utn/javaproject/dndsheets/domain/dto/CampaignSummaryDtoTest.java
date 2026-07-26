package com.utn.javaproject.dndsheets.domain.dto;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CampaignSummaryDtoTest {

    @Test
    void playerCountAndCharacterCount_getterAndSetter_roundTrip() {
        CampaignSummaryDto dto = new CampaignSummaryDto();

        dto.setPlayerCount(3);
        dto.setCharacterCount(2);

        assertThat(dto.getPlayerCount()).isEqualTo(3);
        assertThat(dto.getCharacterCount()).isEqualTo(2);
    }
}
