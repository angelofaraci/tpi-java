package com.utn.javaproject.dndsheets.controllers;

import com.utn.javaproject.dndsheets.domain.dto.LevelDto;
import com.utn.javaproject.dndsheets.domain.dto.LevelKeyDto;
import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;
import com.utn.javaproject.dndsheets.domain.entities.LevelKey;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import com.utn.javaproject.dndsheets.services.LevelService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
public class LevelController {

    private final Mapper<LevelEntity, LevelDto> levelMapper;
    private final LevelService levelService;

    public LevelController(Mapper<LevelEntity, LevelDto> levelMapper, LevelService levelService) {
        this.levelMapper = levelMapper;
        this.levelService = levelService;
    }

    @PutMapping(path = "/levels")
    public ResponseEntity<LevelDto> createLevel(@RequestBody LevelDto levelDto) {
        LevelEntity levelEntity = levelMapper.mapFrom(levelDto);
        LevelEntity savedLevelEntity = levelService.save(levelEntity);
        LevelDto savedLevelDto = levelMapper.mapTo(savedLevelEntity);
        return new ResponseEntity<>(savedLevelDto, HttpStatus.CREATED);
    }

    @GetMapping(path = "/levels")
    public List<LevelDto> listLevels() {
        List<LevelEntity> levels = levelService.findAll();
        return levels.stream().map(levelMapper::mapTo).toList();
    }

    @GetMapping(path = "/level/{characterId}/{classId}")
    public ResponseEntity<LevelDto> getLevel(
            @PathVariable("characterId") Long characterId,
            @PathVariable("classId") Long classId) {

        LevelKey levelKey = new LevelKey(characterId, classId);
        Optional<LevelEntity> foundLevel = levelService.findOne(levelKey);

        return foundLevel.map(levelEntity -> {
            LevelDto levelDto = levelMapper.mapTo(levelEntity);
            return new ResponseEntity<>(levelDto, HttpStatus.OK);
        }).orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping(path = "/level/{characterId}/{classId}")
    public ResponseEntity<LevelDto> fullUpdateLevel(
            @PathVariable("characterId") Long characterId,
            @PathVariable("classId") Long classId,
            @RequestBody LevelDto levelDto) {

        LevelKey levelKey = new LevelKey(characterId, classId);
        if (!levelService.isExists(levelKey)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        LevelKeyDto levelKeyDto = new LevelKeyDto(characterId, classId);
        levelDto.setId(levelKeyDto);

        LevelEntity levelEntity = levelMapper.mapFrom(levelDto);
        LevelEntity savedEntity = levelService.save(levelEntity);
        return new ResponseEntity<>(levelMapper.mapTo(savedEntity), HttpStatus.OK);
    }

    @PatchMapping(path = "/level/{characterId}/{classId}")
    public ResponseEntity<LevelDto> partialUpdate(
            @PathVariable("characterId") Long characterId,
            @PathVariable("classId") Long classId,
            @RequestBody LevelDto levelDto) {

        LevelKey levelKey = new LevelKey(characterId, classId);
        if (!levelService.isExists(levelKey)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        LevelEntity levelEntity = levelMapper.mapFrom(levelDto);
        LevelEntity updatedLevel = levelService.partialUpdate(levelKey, levelEntity);
        return new ResponseEntity<>(levelMapper.mapTo(updatedLevel), HttpStatus.OK);
    }

    @DeleteMapping(path = "/level/{characterId}/{classId}")
    public ResponseEntity deleteLevel(
            @PathVariable("characterId") Long characterId,
            @PathVariable("classId") Long classId) {

        LevelKey levelKey = new LevelKey(characterId, classId);
        levelService.delete(levelKey);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
