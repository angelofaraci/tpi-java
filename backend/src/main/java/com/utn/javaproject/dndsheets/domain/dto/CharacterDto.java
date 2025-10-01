package com.utn.javaproject.dndsheets.domain.dto;

import com.utn.javaproject.dndsheets.domain.dto.CampaignDto;
import com.utn.javaproject.dndsheets.domain.dto.CharacterStatsDto;
import com.utn.javaproject.dndsheets.domain.dto.RaceDto;
import com.utn.javaproject.dndsheets.domain.dto.UserDto;
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
    private Long id;;
    private UserDto user;
    private CampaignDto campaign;
    private String name;
    private List<String> characteristics;
    private String alignment;
    private String background;
    private CharacterStatsDto characterStats;
    private RaceDto race;

}