package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterStatsRepository;
import com.utn.javaproject.dndsheets.repositories.DndClassRepository;
import com.utn.javaproject.dndsheets.services.CharacterService;
import com.utn.javaproject.dndsheets.services.LevelService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class CharacterDeleteFlowTests {

    @Autowired
    private CharacterService characterService;

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private CharacterStatsRepository characterStatsRepository;

    @Autowired
    private DndClassRepository dndClassRepository;

    @Autowired
    private LevelService levelService;

    @Test
    void deleteCharacter_removesCharacterLevelsAndStatsForSelectedCharacter() {
        CharacterEntity character = CharacterEntity.builder()
                .name("Delete Target")
                .characterStats(CharacterStatsEntity.builder()
                        .xp(0L)
                        .proficiency((short) 2)
                        .abilityScores(new HashMap<>())
                        .velocities(List.of(30L))
                        .proficiencies(new HashMap<>())
                        .hp(10)
                        .build())
                .build();

        CharacterEntity saved = characterService.save(character);
        assertNotNull(saved.getId());
        assertNotNull(saved.getCharacterStats());
        assertNotNull(saved.getCharacterStats().getId());

        Long classId = dndClassRepository.findByName("Barbarian")
                .map(DndClassEntity::getId)
                .orElseThrow(() -> new IllegalStateException("Seeded class 'Barbarian' not found"));

        levelService.ensureLevel(saved.getId(), classId, (short) 3);

        characterService.delete(saved.getId());

        assertFalse(characterRepository.existsById(saved.getId()));
        assertFalse(characterStatsRepository.existsById(saved.getCharacterStats().getId()));
        assertFalse(levelService.findOne(new com.utn.javaproject.dndsheets.domain.entities.LevelKey(saved.getId(), classId)).isPresent());
    }
}
