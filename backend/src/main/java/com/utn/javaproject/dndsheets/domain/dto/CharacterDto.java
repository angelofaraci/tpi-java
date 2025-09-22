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
    private Long id;
    private UserDto userDto;
    private CampaignDto campaignDto;
    private String name;
    private List<String> characteristics;
    private String alignment;
    private String Background;
    private CharacterStatsDto charactersStats;
    private RaceDto raceDto;

}