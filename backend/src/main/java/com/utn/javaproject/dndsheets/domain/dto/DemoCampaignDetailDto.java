package com.utn.javaproject.dndsheets.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

/**
 * Public, read-only detail projection of a demo campaign, including its
 * demo characters. Intentionally omits {@code joinCode}, {@code dm}, and
 * {@code players} — those fields must never be exposed to anonymous
 * visitors.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DemoCampaignDetailDto {
    private Long id;
    private String name;
    private String description;
    private Date creationDate;
    private List<DemoCharacterSummaryDto> characters;
}
