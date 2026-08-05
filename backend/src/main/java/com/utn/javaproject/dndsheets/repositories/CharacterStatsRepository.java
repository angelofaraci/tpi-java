package com.utn.javaproject.dndsheets.repositories;

import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CharacterStatsRepository extends JpaRepository<CharacterStatsEntity, Long> {
    void deleteByCharacterId(Long characterId);

    // Bulk JPQL delete used instead of deleteById(Long)/delete(entity): CharacterStatsEntity's
    // eager @OneToOne to CharacterEntity (itself carrying further eager @ManyToOne associations)
    // makes Spring Data's generated entity-level delete path silently no-op for this entity (no
    // DELETE statement is ever emitted, no exception thrown, transaction commits "successfully").
    // A bulk @Modifying query bypasses the entity/cascade machinery entirely and reliably issues
    // the DELETE. Pre-existing bug, discovered and fixed while adding this endpoint's missing
    // existence/ownership checks.
    @Modifying
    @Query("delete from CharacterStatsEntity c where c.id = :id")
    void deleteByIdBulk(@Param("id") Long id);
}
