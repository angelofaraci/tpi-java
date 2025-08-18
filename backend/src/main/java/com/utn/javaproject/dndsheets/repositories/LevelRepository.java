package com.utn.javaproject.dndsheets.repositories;

import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LevelRepository extends JpaRepository<LevelEntity, Long> {
}
