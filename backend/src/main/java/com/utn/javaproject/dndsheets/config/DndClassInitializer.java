package com.utn.javaproject.dndsheets.config;

import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.repositories.DndClassRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DndClassInitializer implements CommandLineRunner {

    private final DndClassRepository dndClassRepository;

    @Override
    public void run(String... args) {
        // Seed only stable identifiers (name + hitDice). Keep levelCharacteristics empty.
        // Idempotent: skip when class already exists by name.
        List<DndClassSeed> seeds = List.of(
                new DndClassSeed("Barbarian", 12),
                new DndClassSeed("Bard", 8),
                new DndClassSeed("Cleric", 8),
                new DndClassSeed("Druid", 8),
                new DndClassSeed("Fighter", 10),
                new DndClassSeed("Monk", 8),
                new DndClassSeed("Paladin", 10),
                new DndClassSeed("Ranger", 10),
                new DndClassSeed("Rogue", 8),
                new DndClassSeed("Sorcerer", 6),
                new DndClassSeed("Warlock", 8),
                new DndClassSeed("Wizard", 6)
        );

        for (DndClassSeed seed : seeds) {
            if (dndClassRepository.existsByName(seed.name())) {
                continue;
            }

            DndClassEntity entity = DndClassEntity.builder()
                    .name(seed.name())
                    .hitDice(seed.hitDice())
                    .build();

            try {
                dndClassRepository.save(entity);
            } catch (DataIntegrityViolationException ex) {
                // Handles concurrent startup races: another instance may have inserted the same name.
            }
        }
    }

    private record DndClassSeed(String name, Integer hitDice) {
    }
}
