package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.RaceRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterStatsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CharacterService {
    private final CharacterRepository characterRepository;
    private final UserRepository userRepository;
    private final CampaignRepository campaignRepository;
    private final RaceRepository raceRepository;
    private final CharacterStatsRepository characterStatsRepository;
    private final LevelService levelService;

    public CharacterService(CharacterRepository characterRepository,
                           UserRepository userRepository,
                           CampaignRepository campaignRepository,
                           RaceRepository raceRepository,
                           CharacterStatsRepository characterStatsRepository,
                           LevelService levelService) {
        this.characterRepository = characterRepository;
        this.userRepository = userRepository;
        this.campaignRepository = campaignRepository;
        this.raceRepository = raceRepository;
        this.characterStatsRepository = characterStatsRepository;
        this.levelService = levelService;
    }

    @Transactional
    public CharacterEntity save(CharacterEntity character) {
        if (character.getUser() != null && character.getUser().getId() != null) {
            character.setUser(userRepository.findById(character.getUser().getId()).orElse(null));
        }
        if (character.getCampaign() != null && character.getCampaign().getId() != null) {
            character.setCampaign(campaignRepository.findById(character.getCampaign().getId()).orElse(null));
        }
        if (character.getRace() != null && character.getRace().getId() != null) {
            character.setRace(raceRepository.findById(character.getRace().getId()).orElse(null));
        }

        if (character.getCharacterStats() != null) {
            character.getCharacterStats().setCharacter(character);
        }

        // First persist the character so it has an ID.
        CharacterEntity saved = characterRepository.save(character);

        // If the client sent initial class levels via CharacterStats (common pattern in this codebase)
        // or other nested structures, we can ensure every (character,class) row has id+level.
        // Right now, the only "class assignment" entity in the model is LevelEntity itself.
        // So: if the frontend creates level rows separately, nothing to do; but if it sent any levels
        // (e.g., through persistence cascade in future), we ensure the key/default level here.
        //
        // Implementation: look for existing LevelEntity rows for this character and normalize them.
        List<LevelEntity> existingLevels = levelService.findByCharacterId(saved.getId());
        for (LevelEntity existing : existingLevels) {
            if (existing.getLevel() == null) {
                existing.setLevel((short) 1);
            }
            // Re-save will ensure LevelKey is created/synced in LevelService.save().
            levelService.save(existing);
        }

        return saved;
    }

    public List<CharacterEntity> findAll() {
        return new ArrayList<>(characterRepository.findAll());
    }

    public Optional<CharacterEntity> findOne(Long id) {
        return characterRepository.findById(id);
    }

    public boolean isExists(Long id) {
        return characterRepository.existsById(id);
    }

    public CharacterEntity partialUpdate(Long id, CharacterEntity characterEntity) {
        characterEntity.setId(id);

        return characterRepository.findById(id).map(existingCharacter -> {
            // Resolve and update associated entities if IDs are provided
            if (characterEntity.getUser() != null) {
                if (characterEntity.getUser().getId() != null) {
                    existingCharacter.setUser(
                            userRepository.findById(characterEntity.getUser().getId()).orElse(null)
                    );
                } else {
                    existingCharacter.setUser(characterEntity.getUser());
                }
            }
            if (characterEntity.getCampaign() != null) {
                if (characterEntity.getCampaign().getId() != null) {
                    existingCharacter.setCampaign(
                            campaignRepository.findById(characterEntity.getCampaign().getId()).orElse(null)
                    );
                } else {
                    existingCharacter.setCampaign(characterEntity.getCampaign());
                }
            }
            Optional.ofNullable(characterEntity.getName()).ifPresent(existingCharacter::setName);
            Optional.ofNullable(characterEntity.getCharacteristics()).ifPresent(existingCharacter::setCharacteristics);
            Optional.ofNullable(characterEntity.getAlignment()).ifPresent(existingCharacter::setAlignment);
            Optional.ofNullable(characterEntity.getBackground()).ifPresent(existingCharacter::setBackground);
            Optional.ofNullable(characterEntity.getCharacterStats()).ifPresent(existingCharacter::setCharacterStats);
            if (characterEntity.getRace() != null) {
                if (characterEntity.getRace().getId() != null) {
                    existingCharacter.setRace(
                            raceRepository.findById(characterEntity.getRace().getId()).orElse(null)
                    );
                } else {
                    existingCharacter.setRace(characterEntity.getRace());
                }
            }

            return characterRepository.save(existingCharacter);
        }).orElseThrow(() -> new RuntimeException("Character does not exist"));
    }

    public void delete(Long id) {
        characterRepository.deleteById(id);
    }

    // Nuevo método: devuelve todos los personajes pertenecientes a un usuario por su id
    public List<CharacterEntity> findByUserId(Long userId) {
        return characterRepository.findByUserId(userId);
    }
}
