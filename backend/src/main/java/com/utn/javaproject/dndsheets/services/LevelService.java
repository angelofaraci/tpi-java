package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;
import com.utn.javaproject.dndsheets.domain.entities.LevelKey;
import com.utn.javaproject.dndsheets.repositories.LevelRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class LevelService {
    private LevelRepository levelRepository;

    public LevelService(LevelRepository levelRepository) {
        this.levelRepository = levelRepository;
    }

    public LevelEntity save(LevelEntity level) {
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
            if (levelEntity.getCharacterEntity() != null) {
                existingLevel.setCharacterEntity(levelEntity.getCharacterEntity());
            }
            if (levelEntity.getDndClassEntity() != null) {
                existingLevel.setDndClassEntity(levelEntity.getDndClassEntity());
            }
            Optional.ofNullable(levelEntity.getLevel()).ifPresent(existingLevel::setLevel);

            return levelRepository.save(existingLevel);
        }).orElseThrow(() -> new RuntimeException("Level does not exist"));
    }

    public void delete(LevelKey id) {
        levelRepository.deleteById(id);
    }
}
