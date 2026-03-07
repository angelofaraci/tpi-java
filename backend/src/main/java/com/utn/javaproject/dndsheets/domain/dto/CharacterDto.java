package com.utn.javaproject.dndsheets.domain.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CharacterDto {
    private Long id;
    @JsonIgnoreProperties("charactersDto")
    private UserDto user;
    @JsonIgnoreProperties("characters")
    private CampaignDto campaign;
    private String name;
    private List<String> characteristics;
    private String alignment;
    private String background;
    private CharacterStatsDto characterStats;
    private RaceDto race;

    /**
     * Preferred create contract: one required primary class and one optional secondary class,
     * each carrying its starting level. Must not be combined with initialClassIds.
     */
    private List<InitialClassLevelDto> initialClasses;

    /**
     * Legacy create contract: class IDs only, translated to level 1 rows when initialClasses is absent.
     */
    private List<Long> initialClassIds;
}
