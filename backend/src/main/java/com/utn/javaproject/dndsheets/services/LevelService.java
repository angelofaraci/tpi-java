package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;
import com.utn.javaproject.dndsheets.domain.entities.LevelKey;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.repositories.LevelRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.DndClassRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class LevelService {
    private final LevelRepository levelRepository;
    private final CharacterRepository characterRepository;
    private final DndClassRepository dndClassRepository;

    public LevelService(LevelRepository levelRepository,
                        CharacterRepository characterRepository,
                        DndClassRepository dndClassRepository) {
        this.levelRepository = levelRepository;
        this.characterRepository = characterRepository;
        this.dndClassRepository = dndClassRepository;
    }

    public LevelEntity save(LevelEntity level) {
        // Resolve and attach CharacterEntity if an ID is provided
        if (level.getCharacterEntity() != null && level.getCharacterEntity().getId() != null) {
            CharacterEntity resolvedCharacter = characterRepository
                    .findById(level.getCharacterEntity().getId())
                    .orElse(null);
            level.setCharacterEntity(resolvedCharacter);
        }
        // Resolve and attach DndClassEntity if an ID is provided
        if (level.getDndClassEntity() != null && level.getDndClassEntity().getId() != null) {
            DndClassEntity resolvedClass = dndClassRepository
                    .findById(level.getDndClassEntity().getId())
                    .orElse(null);
            level.setDndClassEntity(resolvedClass);
        }
        // Ensure embedded key is present & in sync with associated entities
        if (level.getId() == null) {
            Long characterId = level.getCharacterEntity() != null ? level.getCharacterEntity().getId() : null;
            Long classId = level.getDndClassEntity() != null ? level.getDndClassEntity().getId() : null;
            if (characterId != null && classId != null) {
                level.setId(new LevelKey(characterId, classId));
            }
        } else {
            // Sync id fields if associations are already resolved
            if (level.getCharacterEntity() != null) {
                level.getId().setCharacterId(level.getCharacterEntity().getId());
            }
            if (level.getDndClassEntity() != null) {
                level.getId().setClassId(level.getDndClassEntity().getId());
            }
        }
        return levelRepository.save(level);
    }

    public List<LevelEntity> findAll() {
        return new ArrayList<>(levelRepository.findAll());
    }

    public Optional<LevelEntity> findOne(LevelKey id) {
        return levelRepository.findById(id);
    }

    public boolean isExists(LevelKey id) {
        return levelRepository.existsById(id);
    }

    public LevelEntity partialUpdate(LevelKey id, LevelEntity levelEntity) {
        levelEntity.setId(id);

        return levelRepository.findById(id).map(existingLevel -> {
            // Update associations if new ones (with IDs) are provided
            if (levelEntity.getCharacterEntity() != null) {
                if (levelEntity.getCharacterEntity().getId() != null) {
                    CharacterEntity resolvedCharacter = characterRepository
                            .findById(levelEntity.getCharacterEntity().getId())
                            .orElse(null);
                    existingLevel.setCharacterEntity(resolvedCharacter);
                } else {
                    existingLevel.setCharacterEntity(levelEntity.getCharacterEntity());
                }
            }
            if (levelEntity.getDndClassEntity() != null) {
                if (levelEntity.getDndClassEntity().getId() != null) {
                    DndClassEntity resolvedClass = dndClassRepository
                            .findById(levelEntity.getDndClassEntity().getId())
                            .orElse(null);
                    existingLevel.setDndClassEntity(resolvedClass);
                } else {
                    existingLevel.setDndClassEntity(levelEntity.getDndClassEntity());
                }
            }
            Optional.ofNullable(levelEntity.getLevel()).ifPresent(existingLevel::setLevel);

            // Keep embedded key in sync with associations
            if (existingLevel.getCharacterEntity() != null) {
                existingLevel.getId().setCharacterId(existingLevel.getCharacterEntity().getId());
            }
            if (existingLevel.getDndClassEntity() != null) {
                existingLevel.getId().setClassId(existingLevel.getDndClassEntity().getId());
            }

            return levelRepository.save(existingLevel);
        }).orElseThrow(() -> new RuntimeException("Level does not exist"));
    }

    public void delete(LevelKey id) {
        levelRepository.deleteById(id);
    }
}
