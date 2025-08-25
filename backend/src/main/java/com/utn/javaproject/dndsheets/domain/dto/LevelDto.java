package com.utn.javaproject.dndsheets.domain.dto;

import com.utn.javaproject.dndsheets.domain.dto.CharacterDto;
import com.utn.javaproject.dndsheets.domain.dto.DndClassDto;
import com.utn.javaproject.dndsheets.domain.dto.LevelKeyDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LevelDto {
    private LevelKeyDto id;
    private CharacterDto characterDto;
    private DndClassDto dndClassDto;
    private Short level;
}

