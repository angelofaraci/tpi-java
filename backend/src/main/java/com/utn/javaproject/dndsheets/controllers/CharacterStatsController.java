package com.utn.javaproject.dndsheets.controllers;

import com.utn.javaproject.dndsheets.domain.dto.CharacterStatsDto;
import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import com.utn.javaproject.dndsheets.services.CharacterStatsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
public class CharacterStatsController {

    private final Mapper<CharacterStatsEntity, CharacterStatsDto> characterStatsMapper;
    private final CharacterStatsService characterStatsService;

    public CharacterStatsController(Mapper<CharacterStatsEntity, CharacterStatsDto> characterStatsMapper,
                                  CharacterStatsService characterStatsService) {
        this.characterStatsMapper = characterStatsMapper;
        this.characterStatsService = characterStatsService;
    }

    @PutMapping(path = "/character-stats")
    public ResponseEntity<CharacterStatsDto> createCharacterStats(@RequestBody CharacterStatsDto characterStatsDto) {
        CharacterStatsEntity characterStatsEntity = characterStatsMapper.mapFrom(characterStatsDto);
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
}
