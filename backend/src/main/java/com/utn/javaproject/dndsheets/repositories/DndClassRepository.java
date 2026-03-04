package com.utn.javaproject.dndsheets.repositories;

import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DndClassRepository extends JpaRepository<DndClassEntity, Long> {

    boolean existsByName(String name);

    Optional<DndClassEntity> findByName(String name);
}
