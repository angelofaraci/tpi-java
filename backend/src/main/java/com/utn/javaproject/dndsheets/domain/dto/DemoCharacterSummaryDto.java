package com.utn.javaproject.dndsheets.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Public, read-only summary of a demo character for list/card views.
 * Intentionally omits {@code user}/owner identity fields.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DemoCharacterSummaryDto {
    private Long id;
    private String name;
    private String raceName;
    private int level;
    private String alignment;
    private String portraitUrl;
}
