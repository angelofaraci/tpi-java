package com.utn.javaproject.dndsheets.controllers;

import com.utn.javaproject.dndsheets.domain.dto.RaceDto;
import com.utn.javaproject.dndsheets.domain.entities.RaceEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import com.utn.javaproject.dndsheets.services.RaceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
public class RaceController {

    private final Mapper<RaceEntity, RaceDto> raceMapper;
    private final RaceService raceService;

    public RaceController(Mapper<RaceEntity, RaceDto> raceMapper, RaceService raceService) {
        this.raceMapper = raceMapper;
        this.raceService = raceService;
    }

    @PutMapping(path = "/races")
    public ResponseEntity<RaceDto> createRace(@RequestBody RaceDto raceDto) {
        RaceEntity raceEntity = raceMapper.mapFrom(raceDto);
        RaceEntity savedRaceEntity = raceService.save(raceEntity);
        RaceDto savedRaceDto = raceMapper.mapTo(savedRaceEntity);
        return new ResponseEntity<>(savedRaceDto, HttpStatus.CREATED);
    }

    @GetMapping(path = "/races")
    public List<RaceDto> listRaces() {
        List<RaceEntity> races = raceService.findAll();
        return races.stream().map(raceMapper::mapTo).toList();
    }

    @GetMapping(path = "/race/{id}")
    public ResponseEntity<RaceDto> getRace(@PathVariable("id") Long id) {
        Optional<RaceEntity> foundRace = raceService.findOne(id);
        return foundRace.map(raceEntity -> {
            RaceDto raceDto = raceMapper.mapTo(raceEntity);
            return new ResponseEntity<>(raceDto, HttpStatus.OK);
        }).orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping(path = "race/{id}")
    public ResponseEntity<RaceDto> fullUpdateRace(
            @PathVariable("id") Long id,
            @RequestBody RaceDto raceDto) {

        if (!raceService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        raceDto.setId(id);
        RaceEntity raceEntity = raceMapper.mapFrom(raceDto);
        RaceEntity savedEntity = raceService.save(raceEntity);
        return new ResponseEntity<>(raceMapper.mapTo(savedEntity), HttpStatus.OK);
    }

    @PatchMapping(path = "race/{id}")
    public ResponseEntity<RaceDto> partialUpdate(
            @PathVariable("id") Long id,
            @RequestBody RaceDto raceDto) {

        if (!raceService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        RaceEntity raceEntity = raceMapper.mapFrom(raceDto);
        RaceEntity updatedRace = raceService.partialUpdate(id, raceEntity);
        return new ResponseEntity<>(raceMapper.mapTo(updatedRace), HttpStatus.OK);
    }

    @DeleteMapping(path = "race/{id}")
    public ResponseEntity deleteRace(@PathVariable("id") Long id) {
        raceService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
