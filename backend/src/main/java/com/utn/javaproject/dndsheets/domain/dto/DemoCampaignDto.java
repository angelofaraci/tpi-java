package com.utn.javaproject.dndsheets.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * Public, read-only projection of a demo campaign. Intentionally omits
 * {@code joinCode}, {@code dm}, and {@code players} — those fields must
 * never be exposed to anonymous visitors.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DemoCampaignDto {
    private Long id;
    private String name;
    private String description;
    private Date creationDate;
    private int characterCount;
}
