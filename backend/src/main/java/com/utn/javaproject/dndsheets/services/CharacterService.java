package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CharacterService {
    private CharacterRepository characterRepository;

    public CharacterService(CharacterRepository characterRepository) {
        this.characterRepository = characterRepository;
    }

    public CharacterEntity save(CharacterEntity character) {
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
            Optional.ofNullable(characterEntity.getUserEntityId()).ifPresent(existingCharacter::setUserEntityId);
            Optional.ofNullable(characterEntity.getCampaignEntityId()).ifPresent(existingCharacter::setCampaignEntityId);
            Optional.ofNullable(characterEntity.getName()).ifPresent(existingCharacter::setName);
            Optional.ofNullable(characterEntity.getCharacteristics()).ifPresent(existingCharacter::setCharacteristics);
            Optional.ofNullable(characterEntity.getAlignment()).ifPresent(existingCharacter::setAlignment);
            Optional.ofNullable(characterEntity.getBackground()).ifPresent(existingCharacter::setBackground);
            Optional.ofNullable(characterEntity.getCharactersStats()).ifPresent(existingCharacter::setCharactersStats);
            Optional.ofNullable(characterEntity.getRaceEntityId()).ifPresent(existingCharacter::setRaceEntityId);

            return characterRepository.save(existingCharacter);
        }).orElseThrow(() -> new RuntimeException("Character does not exist"));
    }

    public void delete(Long id) {
        characterRepository.deleteById(id);
    }
}
