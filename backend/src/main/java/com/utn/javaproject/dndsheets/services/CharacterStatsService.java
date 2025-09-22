package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import com.utn.javaproject.dndsheets.repositories.CharacterStatsRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CharacterStatsService {
    private CharacterStatsRepository characterStatsRepository;

    public CharacterStatsService(CharacterStatsRepository characterStatsRepository) {
        this.characterStatsRepository = characterStatsRepository;
    }

    public CharacterStatsEntity save(CharacterStatsEntity characterStats) {
        return characterStatsRepository.save(characterStats);
    }

    public List<CharacterStatsEntity> findAll() {
        return new ArrayList<>(characterStatsRepository.findAll());
    }

    public Optional<CharacterStatsEntity> findOne(Long id) {
        return characterStatsRepository.findById(id);
    }

    public boolean isExists(Long id) {
        return characterStatsRepository.existsById(id);
    }

    public CharacterStatsEntity partialUpdate(Long id, CharacterStatsEntity characterStatsEntity) {
        characterStatsEntity.setId(id);

        return characterStatsRepository.findById(id).map(existingStats -> {
            Optional.ofNullable(characterStatsEntity.getCharacterEntity()).ifPresent(existingStats::setCharacterEntity);
            Optional.ofNullable(characterStatsEntity.getXp()).ifPresent(existingStats::setXp);
            Optional.ofNullable(characterStatsEntity.getProficiency()).ifPresent(existingStats::setProficiency);
            Optional.ofNullable(characterStatsEntity.getAbilityScores()).ifPresent(existingStats::setAbilityScores);
            Optional.ofNullable(characterStatsEntity.getVelocities()).ifPresent(existingStats::setVelocities);
            Optional.ofNullable(characterStatsEntity.getProficiencies()).ifPresent(existingStats::setProficiencies);
            Optional.ofNullable(characterStatsEntity.getHp()).ifPresent(existingStats::setHp);

            return characterStatsRepository.save(existingStats);
        }).orElseThrow(() -> new RuntimeException("CharacterStats does not exist"));
    }

    public void delete(Long id) {
        characterStatsRepository.deleteById(id);
    }
}
