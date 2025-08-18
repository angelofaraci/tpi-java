package com.utn.javaproject.dndsheets.repositories;

import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CharacterStatsRepository extends JpaRepository<CharacterStatsEntity, Long> {
}
