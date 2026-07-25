package com.utn.javaproject.dndsheets.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Precomputed class/level entry for a demo character's read-only sheet.
 * Mirrors the shape the authenticated {@code Characters.tsx} sheet already
 * derives client-side from {@code /levels} + {@code /dnd-classes}, so the
 * demo endpoint can stay self-contained without publishing those catalogs.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DemoClassLevelDto {
    private Long classId;
    private String description;
    private int level;
    private List<Feature> features;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class Feature {
        private int level;
        private String text;
    }
}
