package com.utn.javaproject.dndsheets.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

/**
 * Full campaign detail returned by GET /campaign/{id}.
 * Uses flat projection DTOs for players and characters to avoid circular references.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CampaignDetailDto {
    private Long id;
    private String joinCode;
    private String name;
    private String description;
    private Boolean privacy;
    private Date creationDate;
    private List<CampaignPlayerDto> players;
    private List<CampaignCharacterDto> characters;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class CampaignPlayerDto {
        private Long id;
        private String username;
        private String email;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class CampaignCharacterDto {
        private Long id;
        private String name;
        private String alignment;
        private String background;
        private RaceProjection race;
        private UserProjection user;

        @Data
        @AllArgsConstructor
        @NoArgsConstructor
        @Builder
        public static class RaceProjection {
            private Long id;
            private String name;
        }

        @Data
        @AllArgsConstructor
        @NoArgsConstructor
        @Builder
        public static class UserProjection {
            private Long id;
            private String username;
        }
    }
}
