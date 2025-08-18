package com.utn.javaproject.dndsheets.repositories;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CharacterRepository extends JpaRepository<CharacterEntity, Long> {
}
