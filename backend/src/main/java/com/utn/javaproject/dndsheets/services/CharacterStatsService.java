package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import com.utn.javaproject.dndsheets.repositories.CharacterStatsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CharacterStatsService {
    private CharacterStatsRepository characterStatsRepository;
    private final CharacterCreateRequestValidator characterCreateRequestValidator;

    public CharacterStatsService(CharacterStatsRepository characterStatsRepository,
                                 CharacterCreateRequestValidator characterCreateRequestValidator) {
        this.characterStatsRepository = characterStatsRepository;
        this.characterCreateRequestValidator = characterCreateRequestValidator;
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

        if (characterStatsEntity.getAbilityScores() != null) {
            characterCreateRequestValidator.validateAbilityScores(characterStatsEntity.getAbilityScores());
        }

        return characterStatsRepository.findById(id).map(existingStats -> {
            Optional.ofNullable(characterStatsEntity.getCharacter()).ifPresent(existingStats::setCharacter);
            Optional.ofNullable(characterStatsEntity.getXp()).ifPresent(existingStats::setXp);
            Optional.ofNullable(characterStatsEntity.getProficiency()).ifPresent(existingStats::setProficiency);
            Optional.ofNullable(characterStatsEntity.getAbilityScores()).ifPresent(existingStats::setAbilityScores);
            Optional.ofNullable(characterStatsEntity.getVelocities()).ifPresent(existingStats::setVelocities);
            Optional.ofNullable(characterStatsEntity.getProficiencies()).ifPresent(existingStats::setProficiencies);
            Optional.ofNullable(characterStatsEntity.getHp()).ifPresent(existingStats::setHp);

            return characterStatsRepository.save(existingStats);
        }).orElseThrow(() -> new RuntimeException("CharacterStats does not exist"));
    }

    // See CharacterStatsRepository.deleteByIdBulk for why this uses a bulk JPQL delete instead
    // of deleteById(id)/delete(entity).
    @Transactional
    public void delete(Long id) {
        characterStatsRepository.deleteByIdBulk(id);
    }
}
