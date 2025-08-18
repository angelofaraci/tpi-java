package com.utn.javaproject.dndsheets.repositories;

import com.utn.javaproject.dndsheets.domain.entities.RaceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RaceRepository extends JpaRepository<RaceEntity, Long> {
}
