package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.dto.DemoCampaignDto;
import com.utn.javaproject.dndsheets.domain.dto.DemoCharacterDetailDto;
import com.utn.javaproject.dndsheets.domain.dto.DemoCharacterSummaryDto;
import com.utn.javaproject.dndsheets.domain.dto.DemoClassLevelDto;
import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;
import com.utn.javaproject.dndsheets.domain.entities.RaceEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.LevelRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Assembles the seeded demo dataset into public, read-only DTOs. Never
 * serializes entities directly — {@code joinCode}, owner/user identity, and
 * any other real-account field must not leak through this service.
 */
@Service
public class DemoService {

    private final CampaignRepository campaignRepository;
    private final CharacterRepository characterRepository;
    private final LevelRepository levelRepository;

    public DemoService(CampaignRepository campaignRepository,
                        CharacterRepository characterRepository,
                        LevelRepository levelRepository) {
        this.campaignRepository = campaignRepository;
        this.characterRepository = characterRepository;
        this.levelRepository = levelRepository;
    }

    public List<DemoCampaignDto> listCampaigns() {
        return campaignRepository.findByIsDemoTrue().stream().map(this::toCampaignDto).toList();
    }

    public List<DemoCharacterSummaryDto> listCharacters() {
        return characterRepository.findAllDemo().stream().map(this::toSummaryDto).toList();
    }

    public Optional<DemoCharacterDetailDto> findCharacterDetail(Long id) {
        return characterRepository.findDemoById(id).map(this::toDetailDto);
    }

    // ---- private mapping helpers ----

    private DemoCampaignDto toCampaignDto(CampaignEntity campaign) {
        requireDemo(campaign.getIsDemo(), "campaign", campaign.getId());
        int characterCount = campaign.getCharacters() == null ? 0 : campaign.getCharacters().size();
        return DemoCampaignDto.builder()
                .id(campaign.getId())
                .name(campaign.getName())
                .description(campaign.getDescription())
                .creationDate(campaign.getCreationDate())
                .characterCount(characterCount)
                .build();
    }

    private DemoCharacterSummaryDto toSummaryDto(CharacterEntity character) {
        requireDemo(character.getIsDemo(), "character", character.getId());
        RaceEntity race = character.getRace();
        return DemoCharacterSummaryDto.builder()
                .id(character.getId())
                .name(character.getName())
                .raceName(race != null ? race.getName() : null)
                .level(totalLevel(character.getId()))
                .alignment(character.getAlignment())
                .portraitUrl(character.getPortraitUrl())
                .build();
    }

    private DemoCharacterDetailDto toDetailDto(CharacterEntity character) {
        requireDemo(character.getIsDemo(), "character", character.getId());
        RaceEntity race = character.getRace();
        CharacterStatsEntity stats = character.getCharacterStats();

        return DemoCharacterDetailDto.builder()
                .id(character.getId())
                .name(character.getName())
                .raceName(race != null ? race.getName() : null)
                .racialFeats(race != null && race.getRacialFeats() != null ? race.getRacialFeats() : List.of())
                .background(character.getBackground())
                .characteristics(character.getCharacteristics() != null ? character.getCharacteristics() : List.of())
                .alignment(character.getAlignment())
                .portraitUrl(character.getPortraitUrl())
                .proficiency(stats != null ? stats.getProficiency() : null)
                .abilityScores(stats != null && stats.getAbilityScores() != null
                        ? new HashMap<>(stats.getAbilityScores()) : new HashMap<>())
                .proficiencies(stats != null && stats.getProficiencies() != null
                        ? new HashMap<>(stats.getProficiencies()) : new HashMap<>())
                .velocity(stats != null && stats.getVelocities() != null && !stats.getVelocities().isEmpty()
                        ? stats.getVelocities().get(0) : null)
                .hp(stats != null ? stats.getHp() : null)
                .classes(toClassLevels(character.getId()))
                .build();
    }

    private List<DemoClassLevelDto> toClassLevels(Long characterId) {
        List<LevelEntity> levels = levelRepository.findByIdCharacterId(characterId);
        if (levels == null || levels.isEmpty()) {
            return List.of();
        }
        return levels.stream()
                .filter(level -> level.getDndClass() != null)
                .map(this::toClassLevelDto)
                .toList();
    }

    private DemoClassLevelDto toClassLevelDto(LevelEntity level) {
        int classLevel = level.getLevel() != null ? level.getLevel() : 0;
        Map<Short, String> characteristics = level.getDndClass().getLevelCharacteristics();
        List<DemoClassLevelDto.Feature> features = characteristics == null
                ? List.of()
                : characteristics.entrySet().stream()
                        .filter(entry -> entry.getKey() != null && entry.getKey() > 0 && entry.getKey() <= classLevel)
                        .filter(entry -> entry.getValue() != null && !entry.getValue().isBlank())
                        .sorted(Map.Entry.comparingByKey())
                        .map(entry -> DemoClassLevelDto.Feature.builder()
                                .level(entry.getKey())
                                .text(entry.getValue())
                                .build())
                        .toList();

        return DemoClassLevelDto.builder()
                .classId(level.getDndClass().getId())
                .description(level.getDndClass().getName() != null
                        ? level.getDndClass().getName() : level.getDndClass().getDescription())
                .level(classLevel)
                .features(features)
                .build();
    }

    // Defense-in-depth: the real filter lives in the repository queries
    // (findByIsDemoTrue/findAllDemo/findDemoById), but a mapper called on a
    // non-demo row anywhere in this service must fail loudly, not leak silently.
    private void requireDemo(Boolean isDemo, String entityType, Long id) {
        if (!Boolean.TRUE.equals(isDemo)) {
            throw new IllegalStateException(
                    "DemoService mapped a non-demo " + entityType + " (id=" + id + "); refusing to expose it anonymously.");
        }
    }

    private int totalLevel(Long characterId) {
        return levelRepository.findByIdCharacterId(characterId).stream()
                .mapToInt(level -> level.getLevel() != null ? level.getLevel() : 0)
                .sum();
    }
}
