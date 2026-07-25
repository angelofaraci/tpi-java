package com.utn.javaproject.dndsheets.repositories;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CharacterRepository extends JpaRepository<CharacterEntity, Long> {
    // Returns all characters belonging to a given user id
    List<CharacterEntity> findByUserId(Long userId);

    @Query("SELECT c FROM CharacterEntity c WHERE c.isDemo = true")
    List<CharacterEntity> findAllDemo();

    @Query("SELECT c FROM CharacterEntity c WHERE c.isDemo = true AND c.id = ?1")
    Optional<CharacterEntity> findDemoById(Long id);
}
