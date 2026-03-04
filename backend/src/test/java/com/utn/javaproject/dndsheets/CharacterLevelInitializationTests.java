package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;
import com.utn.javaproject.dndsheets.domain.entities.LevelKey;
import com.utn.javaproject.dndsheets.repositories.DndClassRepository;
import com.utn.javaproject.dndsheets.services.CharacterService;
import com.utn.javaproject.dndsheets.services.LevelService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class CharacterLevelInitializationTests {

    @Autowired
    private CharacterService characterService;

    @Autowired
    private LevelService levelService;

    @Autowired
    private DndClassRepository dndClassRepository;

    @Test
    void createCharacter_doesNotFailWhenNoCharacterStats() {
        CharacterEntity character = CharacterEntity.builder()
                .name("NoStats")
                .build();

        CharacterEntity saved = characterService.save(character);
        assertNotNull(saved.getId());
    }

    @Test
    void ensureLevel_createsLevelKeyAndDefaultLevel() {
        CharacterEntity character = CharacterEntity.builder()
                .name("WithLevel")
                .build();
        CharacterEntity saved = characterService.save(character);

        Long classId = dndClassRepository.findByName("Barbarian")
                .map(DndClassEntity::getId)
                .orElseThrow(() -> new IllegalStateException("Seeded class 'Barbarian' not found"));
        LevelEntity level = levelService.ensureLevel(saved.getId(), classId);

        assertNotNull(level.getId());
        assertEquals(saved.getId(), level.getId().getCharacterId());
        assertEquals(classId, level.getId().getClassId());
        assertNotNull(level.getLevel());
        assertEquals((short) 1, level.getLevel());

        Optional<LevelEntity> reloaded = levelService.findOne(new LevelKey(saved.getId(), classId));
        assertTrue(reloaded.isPresent());
    }
}
