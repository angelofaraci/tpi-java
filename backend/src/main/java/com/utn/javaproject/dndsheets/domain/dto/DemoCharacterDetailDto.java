package com.utn.javaproject.dndsheets.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.List;

/**
 * Full read-only character sheet for a demo character. Intentionally omits
 * {@code user}/owner identity fields — only safe, sheet-rendering data is
 * ever included.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DemoCharacterDetailDto {
    private Long id;
    private String name;
    private String raceName;
    private List<String> racialFeats;
    private String background;
    private List<String> characteristics;
    private String alignment;
    private String portraitUrl;
    private Short proficiency;
    private HashMap<String, Short> abilityScores;
    private HashMap<String, Short> proficiencies;
    private Long velocity;
    private Integer hp;
    private List<DemoClassLevelDto> classes;
}
