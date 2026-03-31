package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.dto.CharacterDto;
import com.utn.javaproject.dndsheets.domain.dto.CharacterStatsDto;
import com.utn.javaproject.dndsheets.domain.dto.InitialClassLevelDto;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class CharacterCreateRequestValidator {

    private static final short DEFAULT_INITIAL_LEVEL = 1;
    private static final int MAX_INITIAL_CLASSES = 2;
    private static final short MIN_ABILITY_SCORE = 1;
    private static final short MAX_ABILITY_SCORE = 20;

    private static final Set<String> CANONICAL_ALIGNMENTS = Set.of(
            "Lawful Good", "Neutral Good", "Chaotic Good",
            "Lawful Neutral", "True Neutral", "Chaotic Neutral",
            "Lawful Evil", "Neutral Evil", "Chaotic Evil"
    );

    private static final Set<String> REQUIRED_ABILITY_SCORE_KEYS = Set.of(
            "Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"
    );

    public List<InitialClassLevelDto> validate(CharacterDto characterDto) {
        validateAlignment(characterDto.getAlignment());

        CharacterStatsDto stats = characterDto.getCharacterStats();
        if (stats != null && stats.getAbilityScores() != null) {
            validateAbilityScores(stats.getAbilityScores());
        }

        List<InitialClassLevelDto> preferredInitialClasses = characterDto.getInitialClasses();
        List<Long> legacyInitialClassIds = characterDto.getInitialClassIds();

        if (preferredInitialClasses != null && legacyInitialClassIds != null) {
            throw new IllegalArgumentException("Send either initialClasses or initialClassIds, not both");
        }

        if (preferredInitialClasses != null) {
            return validatePreferredInitialClasses(preferredInitialClasses);
        }

        if (legacyInitialClassIds != null) {
            return validateLegacyInitialClassIds(legacyInitialClassIds);
        }

        return List.of();
    }

    private List<InitialClassLevelDto> validatePreferredInitialClasses(List<InitialClassLevelDto> initialClasses) {
        if (initialClasses.size() > MAX_INITIAL_CLASSES) {
            throw new IllegalArgumentException("A character can start with at most two classes");
        }

        List<InitialClassLevelDto> normalized = new ArrayList<>();
        Set<Long> uniqueClassIds = new LinkedHashSet<>();

        for (InitialClassLevelDto initialClass : initialClasses) {
            if (initialClass == null || initialClass.getClassId() == null) {
                throw new IllegalArgumentException("Each initial class must include a classId");
            }

            Short level = initialClass.getLevel() == null ? DEFAULT_INITIAL_LEVEL : initialClass.getLevel();
            if (level < DEFAULT_INITIAL_LEVEL) {
                throw new IllegalArgumentException("Initial class levels must be at least 1");
            }

            if (!uniqueClassIds.add(initialClass.getClassId())) {
                throw new IllegalArgumentException("Initial classes must be unique");
            }

            normalized.add(InitialClassLevelDto.builder()
                    .classId(initialClass.getClassId())
                    .level(level)
                    .build());
        }

        return normalized;
    }

    private List<InitialClassLevelDto> validateLegacyInitialClassIds(List<Long> initialClassIds) {
        if (initialClassIds.size() > MAX_INITIAL_CLASSES) {
            throw new IllegalArgumentException("A character can start with at most two classes");
        }

        List<InitialClassLevelDto> normalized = new ArrayList<>();
        Set<Long> uniqueClassIds = new LinkedHashSet<>();

        for (Long classId : initialClassIds) {
            if (classId == null) {
                throw new IllegalArgumentException("Each legacy initial class must include a classId");
            }

            if (!uniqueClassIds.add(classId)) {
                throw new IllegalArgumentException("Initial classes must be unique");
            }

            normalized.add(InitialClassLevelDto.builder()
                    .classId(classId)
                    .level(DEFAULT_INITIAL_LEVEL)
                    .build());
        }

        return normalized;
    }

    public void validateAlignment(String alignment) {
        if (alignment == null || !CANONICAL_ALIGNMENTS.contains(alignment.trim())) {
            throw new IllegalArgumentException("Alignment must be one of the canonical D&D values");
        }
    }

    public void validateAbilityScores(Map<String, Short> abilityScores) {
        if (abilityScores == null || !new HashSet<>(abilityScores.keySet()).equals(REQUIRED_ABILITY_SCORE_KEYS)) {
            throw new IllegalArgumentException("Ability scores must contain exactly the six canonical abilities");
        }

        for (Short value : abilityScores.values()) {
            if (value == null || value < MIN_ABILITY_SCORE || value > MAX_ABILITY_SCORE) {
                throw new IllegalArgumentException("Ability scores must be between 1 and 20");
            }
        }
    }
}
