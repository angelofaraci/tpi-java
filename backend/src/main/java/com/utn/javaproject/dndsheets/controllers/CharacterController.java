package com.utn.javaproject.dndsheets.controllers;

import com.utn.javaproject.dndsheets.domain.dto.CharacterDto;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import com.utn.javaproject.dndsheets.services.CharacterService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
public class CharacterController {

    private final Mapper<CharacterEntity, CharacterDto> characterMapper;
    private final CharacterService characterService;

    public CharacterController(Mapper<CharacterEntity, CharacterDto> characterMapper, CharacterService characterService) {
        this.characterMapper = characterMapper;
        this.characterService = characterService;
    }

    @PutMapping(path = "/characters")
    public ResponseEntity<CharacterDto> createCharacter(@RequestBody CharacterDto characterDto) {
        CharacterEntity characterEntity = characterMapper.mapFrom(characterDto);
        CharacterEntity savedCharacterEntity = characterService.save(characterEntity);
        CharacterDto savedCharacterDto = characterMapper.mapTo(savedCharacterEntity);
        return new ResponseEntity<>(savedCharacterDto, HttpStatus.CREATED);
    }

    @GetMapping(path = "/characters")
    public List<CharacterDto> listCharacters() {
        List<CharacterEntity> characters = characterService.findAll();
        return characters.stream().map(characterMapper::mapTo).toList();
    }

    @GetMapping(path = "/character/{id}")
    public ResponseEntity<CharacterDto> getCharacter(@PathVariable("id") Long id) {
        Optional<CharacterEntity> foundCharacter = characterService.findOne(id);
        return foundCharacter.map(characterEntity -> {
            CharacterDto characterDto = characterMapper.mapTo(characterEntity);
            return new ResponseEntity<>(characterDto, HttpStatus.OK);
        }).orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping(path = "character/{id}")
    public ResponseEntity<CharacterDto> fullUpdateCharacter(
            @PathVariable("id") Long id,
            @RequestBody CharacterDto characterDto) {

        if (!characterService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        characterDto.setId(id);
        CharacterEntity characterEntity = characterMapper.mapFrom(characterDto);
        CharacterEntity savedEntity = characterService.save(characterEntity);
        return new ResponseEntity<>(characterMapper.mapTo(savedEntity), HttpStatus.OK);
    }

    @PatchMapping(path = "character/{id}")
    public ResponseEntity<CharacterDto> partialUpdate(
            @PathVariable("id") Long id,
            @RequestBody CharacterDto characterDto) {

        if (!characterService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        CharacterEntity characterEntity = characterMapper.mapFrom(characterDto);
        CharacterEntity updatedCharacter = characterService.partialUpdate(id, characterEntity);
        return new ResponseEntity<>(characterMapper.mapTo(updatedCharacter), HttpStatus.OK);
    }

    @DeleteMapping(path = "character/{id}")
    public ResponseEntity deleteCharacter(@PathVariable("id") Long id) {
        characterService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
