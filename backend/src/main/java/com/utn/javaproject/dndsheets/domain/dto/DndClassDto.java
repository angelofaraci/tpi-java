package com.utn.javaproject.dndsheets.domain.dto;

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
public class DndClassDto {
    private Long id;
    private String name;
    private String description;
    private HashMap<Short, String> levelCharacteristics;
    private Integer hitDice;
    private List<String> savingThrows;

}
