package com.utn.javaproject.dndsheets.domain.dto;

import com.utn.javaproject.dndsheets.domain.dto.CharacterDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RaceDto {
    private Long id;
    private String description;
    private List<String> racialFeats;
    private List<CharacterDto> characterDto;
}
