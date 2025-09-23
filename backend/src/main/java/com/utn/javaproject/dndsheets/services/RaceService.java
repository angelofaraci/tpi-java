package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.RaceEntity;
import com.utn.javaproject.dndsheets.repositories.RaceRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class RaceService {
    private final RaceRepository raceRepository;

    public RaceService(RaceRepository raceRepository) {
        this.raceRepository = raceRepository;
    }

    public RaceEntity save(RaceEntity race) {
        return raceRepository.save(race);
    }

    public List<RaceEntity> findAll() {
        return new ArrayList<>(raceRepository.findAll());
    }

    public Optional<RaceEntity> findOne(Long id) {
        return raceRepository.findById(id);
    }

    public boolean isExists(Long id) {
        return raceRepository.existsById(id);
    }

    public RaceEntity partialUpdate(Long id, RaceEntity raceEntity) {
        raceEntity.setId(id);

        return raceRepository.findById(id).map(existingRace -> {
            Optional.ofNullable(raceEntity.getName()).ifPresent(existingRace::setName);
            Optional.ofNullable(raceEntity.getDescription()).ifPresent(existingRace::setDescription);
            Optional.ofNullable(raceEntity.getRacialFeats()).ifPresent(existingRace::setRacialFeats);

            return raceRepository.save(existingRace);
        }).orElseThrow(() -> new RuntimeException("Race does not exist"));
    }

    public void delete(Long id) {
        raceRepository.deleteById(id);
    }
}
