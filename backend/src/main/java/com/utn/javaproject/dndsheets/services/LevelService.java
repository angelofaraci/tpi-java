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
        // Resolve and attach Character if an ID is provided
        if (level.getCharacter() != null && level.getCharacter().getId() != null) {
            CharacterEntity resolvedCharacter = characterRepository
                    .findById(level.getCharacter().getId())
                    .orElse(null);
            level.setCharacter(resolvedCharacter);
        }
        // Resolve and attach DndClass if an ID is provided
        if (level.getDndClass() != null && level.getDndClass().getId() != null) {
            DndClassEntity resolvedClass = dndClassRepository
                    .findById(level.getDndClass().getId())
                    .orElse(null);
            level.setDndClass(resolvedClass);
        }
        // Ensure embedded key is present & in sync with associated entities
        if (level.getId() == null) {
            Long characterId = level.getCharacter() != null ? level.getCharacter().getId() : null;
            Long classId = level.getDndClass() != null ? level.getDndClass().getId() : null;
            if (characterId != null && classId != null) {
                level.setId(new LevelKey(characterId, classId));
            }
        } else {
            // Sync id fields if associations are already resolved
            if (level.getCharacter() != null) {
                level.getId().setCharacterId(level.getCharacter().getId());
            }
            if (level.getDndClass() != null) {
                level.getId().setClassId(level.getDndClass().getId());
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
            if (levelEntity.getCharacter() != null) {
                if (levelEntity.getCharacter().getId() != null) {
                    CharacterEntity resolvedCharacter = characterRepository
                            .findById(levelEntity.getCharacter().getId())
                            .orElse(null);
                    existingLevel.setCharacter(resolvedCharacter);
                } else {
                    existingLevel.setCharacter(levelEntity.getCharacter());
                }
            }
            if (levelEntity.getDndClass() != null) {
                if (levelEntity.getDndClass().getId() != null) {
                    DndClassEntity resolvedClass = dndClassRepository
                            .findById(levelEntity.getDndClass().getId())
                            .orElse(null);
                    existingLevel.setDndClass(resolvedClass);
                } else {
                    existingLevel.setDndClass(levelEntity.getDndClass());
                }
            }
            Optional.ofNullable(levelEntity.getLevel()).ifPresent(existingLevel::setLevel);

            // Keep embedded key in sync with associations
            if (existingLevel.getCharacter() != null) {
                existingLevel.getId().setCharacterId(existingLevel.getCharacter().getId());
            }
            if (existingLevel.getDndClass() != null) {
                existingLevel.getId().setClassId(existingLevel.getDndClass().getId());
            }

            return levelRepository.save(existingLevel);
        }).orElseThrow(() -> new RuntimeException("Level does not exist"));
    }

    public void delete(LevelKey id) {
        levelRepository.deleteById(id);
    }
}
