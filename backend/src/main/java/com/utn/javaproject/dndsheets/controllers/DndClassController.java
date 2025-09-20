package com.utn.javaproject.dndsheets.controllers;

import com.utn.javaproject.dndsheets.domain.dto.DndClassDto;
import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import com.utn.javaproject.dndsheets.services.DndClassService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
public class DndClassController {

    private final Mapper<DndClassEntity, DndClassDto> dndClassMapper;
    private final DndClassService dndClassService;

    public DndClassController(Mapper<DndClassEntity, DndClassDto> dndClassMapper,
                            DndClassService dndClassService) {
        this.dndClassMapper = dndClassMapper;
        this.dndClassService = dndClassService;
    }

    @PostMapping(path = "/dnd-classes")
    public ResponseEntity<DndClassDto> createDndClass(@RequestBody DndClassDto dndClassDto) {
        DndClassEntity dndClassEntity = dndClassMapper.mapFrom(dndClassDto);
        DndClassEntity savedDndClassEntity = dndClassService.save(dndClassEntity);
        DndClassDto savedDndClassDto = dndClassMapper.mapTo(savedDndClassEntity);
        return new ResponseEntity<>(savedDndClassDto, HttpStatus.CREATED);
    }

    @GetMapping(path = "/dnd-classes")
    public List<DndClassDto> listDndClasses() {
        List<DndClassEntity> dndClasses = dndClassService.findAll();
        return dndClasses.stream().map(dndClassMapper::mapTo).toList();
    }

    @GetMapping(path = "/dnd-class/{id}")
    public ResponseEntity<DndClassDto> getDndClass(@PathVariable("id") Long id) {
        Optional<DndClassEntity> foundDndClass = dndClassService.findOne(id);
        return foundDndClass.map(dndClassEntity -> {
            DndClassDto dndClassDto = dndClassMapper.mapTo(dndClassEntity);
            return new ResponseEntity<>(dndClassDto, HttpStatus.OK);
        }).orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping(path = "dnd-class/{id}")
    public ResponseEntity<DndClassDto> fullUpdateDndClass(
            @PathVariable("id") Long id,
            @RequestBody DndClassDto dndClassDto) {

        if (!dndClassService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        dndClassDto.setId(id);
        DndClassEntity dndClassEntity = dndClassMapper.mapFrom(dndClassDto);
        DndClassEntity savedEntity = dndClassService.save(dndClassEntity);
        return new ResponseEntity<>(dndClassMapper.mapTo(savedEntity), HttpStatus.OK);
    }

    @PatchMapping(path = "dnd-class/{id}")
    public ResponseEntity<DndClassDto> partialUpdate(
            @PathVariable("id") Long id,
            @RequestBody DndClassDto dndClassDto) {

        if (!dndClassService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        DndClassEntity dndClassEntity = dndClassMapper.mapFrom(dndClassDto);
        DndClassEntity updatedDndClass = dndClassService.partialUpdate(id, dndClassEntity);
        return new ResponseEntity<>(dndClassMapper.mapTo(updatedDndClass), HttpStatus.OK);
    }

    @DeleteMapping(path = "dnd-class/{id}")
    public ResponseEntity deleteDndClass(@PathVariable("id") Long id) {
        dndClassService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
