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
     * NEW (preferred): list of class IDs with their starting level. Lets you start any class at level > 1.
     */
    private List<InitialClassLevelDto> initialClasses;

    /**
     * Legacy: list of class IDs the user assigns when creating the character (created with level=1).
     */
    private List<Long> initialClassIds;
}