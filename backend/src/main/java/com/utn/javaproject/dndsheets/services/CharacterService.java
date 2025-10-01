package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.RaceRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterStatsRepository;
import org.springframework.stereotype.Service;

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

    public CharacterService(CharacterRepository characterRepository,
                           UserRepository userRepository,
                           CampaignRepository campaignRepository,
                           RaceRepository raceRepository,
                            CharacterStatsRepository characterStatsRepository) {
        this.characterRepository = characterRepository;
        this.userRepository = userRepository;
        this.campaignRepository = campaignRepository;
        this.raceRepository = raceRepository;
        this.characterStatsRepository = characterStatsRepository;
    }

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
        character.getCharacterStats().setCharacter(character);
        return characterRepository.save(character);
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
}
