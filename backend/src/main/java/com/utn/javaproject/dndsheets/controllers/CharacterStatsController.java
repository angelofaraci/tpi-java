package com.utn.javaproject.dndsheets.controllers;

import com.utn.javaproject.dndsheets.domain.dto.CharacterStatsDto;
import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import com.utn.javaproject.dndsheets.services.CharacterStatsService;
import com.utn.javaproject.dndsheets.services.LevelService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.utn.javaproject.dndsheets.domain.entities.LevelKey;
import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@RestController
public class CharacterStatsController {

    private final Mapper<CharacterStatsEntity, CharacterStatsDto> characterStatsMapper;
    private final CharacterStatsService characterStatsService;
    private final LevelService levelService;

    public CharacterStatsController(Mapper<CharacterStatsEntity, CharacterStatsDto> characterStatsMapper,
                                    CharacterStatsService characterStatsService, LevelService levelService) {
        this.characterStatsMapper = characterStatsMapper;
        this.characterStatsService = characterStatsService;
        this.levelService = levelService;
    }

    @PostMapping(path = "/character-stats")
    public ResponseEntity<CharacterStatsDto> createCharacterStats(@RequestBody CharacterStatsDto characterStatsDto) {
        CharacterStatsEntity characterStatsEntity = characterStatsMapper.mapFrom(characterStatsDto);
        if (!(characterStatsEntity.getAbilityScores().size() == 6)) {
            Set<String> requiredKeys = Set.of("Strength", "Dexterity", "Constitution",
                    "Intelligence", "Wisdom", "Charisma");

            if(!characterStatsEntity.getAbilityScores().keySet().equals(requiredKeys)){
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            };
            for(Short value: characterStatsEntity.getAbilityScores().values()){
                if(value<1 || value>20){
                    return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
                }
            }
        }

        Set<String> requiredProficiencies = Set.of(
            "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History",
            "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception",
            "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"
        );
        if (characterStatsEntity.getProficiencies() == null ||
            !characterStatsEntity.getProficiencies().keySet().equals(requiredProficiencies)) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        for (Short value : characterStatsEntity.getProficiencies().values()) {
            if (value == null || (value != 0 && value != 1 && value != 2)) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
        }

        CharacterStatsEntity savedCharacterStatsEntity = characterStatsService.save(characterStatsEntity);
        CharacterStatsDto savedCharacterStatsDto = characterStatsMapper.mapTo(savedCharacterStatsEntity);
        return new ResponseEntity<>(savedCharacterStatsDto, HttpStatus.CREATED);
    }

    @GetMapping(path = "/character-stats")
    public List<CharacterStatsDto> listCharacterStats() {
        List<CharacterStatsEntity> characterStats = characterStatsService.findAll();
        return characterStats.stream().map(characterStatsMapper::mapTo).toList();
    }

    @GetMapping(path = "/character-stats/{id}")
    public ResponseEntity<CharacterStatsDto> getCharacterStats(@PathVariable("id") Long id) {
        Optional<CharacterStatsEntity> foundCharacterStats = characterStatsService.findOne(id);
        return foundCharacterStats.map(characterStatsEntity -> {
            CharacterStatsDto characterStatsDto = characterStatsMapper.mapTo(characterStatsEntity);
            return new ResponseEntity<>(characterStatsDto, HttpStatus.OK);
        }).orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping(path = "character-stats/{id}")
    public ResponseEntity<CharacterStatsDto> fullUpdateCharacterStats(
            @PathVariable("id") Long id,
            @RequestBody CharacterStatsDto characterStatsDto) {

        if (!characterStatsService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        characterStatsDto.setId(id);
        CharacterStatsEntity characterStatsEntity = characterStatsMapper.mapFrom(characterStatsDto);
        CharacterStatsEntity savedEntity = characterStatsService.save(characterStatsEntity);
        return new ResponseEntity<>(characterStatsMapper.mapTo(savedEntity), HttpStatus.OK);
    }

    @PatchMapping(path = "character-stats/{id}")
    public ResponseEntity<CharacterStatsDto> partialUpdate(
            @PathVariable("id") Long id,
            @RequestBody CharacterStatsDto characterStatsDto) {

        if (!characterStatsService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        CharacterStatsEntity characterStatsEntity = characterStatsMapper.mapFrom(characterStatsDto);
        CharacterStatsEntity updatedCharacterStats = characterStatsService.partialUpdate(id, characterStatsEntity);
        return new ResponseEntity<>(characterStatsMapper.mapTo(updatedCharacterStats), HttpStatus.OK);
    }

    @DeleteMapping(path = "character-stats/{id}")
    public ResponseEntity deleteCharacterStats(@PathVariable("id") Long id) {
        characterStatsService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PutMapping(path = "character-stats/{id}/{classid}")
    public ResponseEntity<CharacterStatsDto> updateCharacterHp(
            @PathVariable("id") Long characterStatsId,
            @PathVariable("classId") Long classId) {
        Optional<CharacterStatsEntity> foundCharacterStats = characterStatsService.findOne(characterStatsId);
        if (!foundCharacterStats.isEmpty()) {


            CharacterStatsEntity characterStatsEntity = foundCharacterStats.get();
            LevelEntity characterLevel = levelService.findOne(new LevelKey(characterStatsEntity.getCharacter().getId(), classId))
                    .orElse(null);
            Short level = characterLevel.getLevel();
            Short constitutionModifier = (short) Math.floor((characterStatsEntity.getAbilityScores().get("Constitution")-10)/2);
            Integer hitDice = characterLevel.getDndClassEntity().getHitDice();
            characterStatsEntity.setHp((level-1)*(constitutionModifier+hitDice));
            CharacterStatsEntity updatedCharacterStats = characterStatsService.save(characterStatsEntity);
            return new ResponseEntity<>(characterStatsMapper.mapTo(updatedCharacterStats), HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

    }
}
