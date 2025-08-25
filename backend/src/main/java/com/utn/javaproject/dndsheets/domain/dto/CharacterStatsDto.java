package com.utn.javaproject.dndsheets.domain.dto;

import com.utn.javaproject.dndsheets.domain.dto.CharacterDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CharacterStatsDto {
    private Long id;
    private CharacterDto characterDtoId;
    private Long xp;
    private Short proficiency;
    private HashMap<String,Short> abilityScores;
    private HashMap<String, Short> abilityModifier;
    private List<Long> velocities;
    private HashMap<String, Short> proficiencies;
    private Long hp;
}
