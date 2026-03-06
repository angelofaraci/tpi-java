package com.utn.javaproject.dndsheets.config;

import com.utn.javaproject.dndsheets.domain.entities.RaceEntity;
import com.utn.javaproject.dndsheets.repositories.RaceRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(4)
public class RaceInitializer implements CommandLineRunner {

    private final RaceRepository raceRepository;

    public RaceInitializer(RaceRepository raceRepository) {
        this.raceRepository = raceRepository;
    }

    @Override
    public void run(String... args) {
        List<RaceSeed> seeds = List.of(
                new RaceSeed(
                        "Human",
                        "Versatile and ambitious people found throughout the realms.",
                        List.of("Extra Language", "Adaptable")
                ),
                new RaceSeed(
                        "Elf",
                        "Graceful folk with keen senses and a strong tie to magic.",
                        List.of("Darkvision", "Keen Senses", "Fey Ancestry")
                ),
                new RaceSeed(
                        "Dwarf",
                        "Resilient mountain folk known for their endurance and craftsmanship.",
                        List.of("Darkvision", "Dwarven Resilience", "Stonecunning")
                ),
                new RaceSeed(
                        "Halfling",
                        "Lucky and nimble wanderers who thrive by wit and courage.",
                        List.of("Lucky", "Brave", "Halfling Nimbleness")
                )
        );

        for (RaceSeed seed : seeds) {
            if (raceRepository.existsByName(seed.name())) {
                continue;
            }

            RaceEntity entity = new RaceEntity();
            entity.setName(seed.name());
            entity.setDescription(seed.description());
            entity.setRacialFeats(seed.racialFeats());

            try {
                raceRepository.save(entity);
            } catch (DataIntegrityViolationException ex) {
                // Handles concurrent startup races when another instance seeds first.
            }
        }
    }

    private record RaceSeed(String name, String description, List<String> racialFeats) {
    }
}
