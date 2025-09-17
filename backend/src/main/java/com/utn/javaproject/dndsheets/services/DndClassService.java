package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.repositories.DndClassRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class DndClassService {
    private final DndClassRepository dndClassRepository;

    public DndClassService(DndClassRepository dndClassRepository) {
        this.dndClassRepository = dndClassRepository;
    }

    public DndClassEntity save(DndClassEntity dndClass) {
        return dndClassRepository.save(dndClass);
    }

    public List<DndClassEntity> findAll() {
        return new ArrayList<>(dndClassRepository.findAll());
    }

    public Optional<DndClassEntity> findOne(Long id) {
        return dndClassRepository.findById(id);
    }

    public boolean isExists(Long id) {
        return dndClassRepository.existsById(id);
    }

    public DndClassEntity partialUpdate(Long id, DndClassEntity dndClassEntity) {
        dndClassEntity.setId(id);

        return dndClassRepository.findById(id).map(existingClass -> {
            Optional.ofNullable(dndClassEntity.getDescription()).ifPresent(existingClass::setDescription);
            Optional.ofNullable(dndClassEntity.getLevelCharacteristics()).ifPresent(existingClass::setLevelCharacteristics);

            return dndClassRepository.save(existingClass);
        }).orElseThrow(() -> new RuntimeException("DndClass does not exist"));
    }

    public void delete(Long id) {
        dndClassRepository.deleteById(id);
    }
}
