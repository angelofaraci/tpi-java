package com.utn.javaproject.dndsheets.repositories;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CampaignRepository extends JpaRepository<CampaignEntity, Long> {

    boolean existsByName(String name);

    Optional<CampaignEntity> findByJoinCode(String joinCode);

    @Query("SELECT c FROM CampaignEntity c WHERE c.dm.id = ?1 ORDER BY c.creationDate DESC")
    List<CampaignEntity> findAllByDmIdOrderByCreationDateDesc(Long dmId);

    @Query("SELECT c FROM CampaignEntity c WHERE c.privacy = false OR c.privacy IS NULL")
    List<CampaignEntity> findAllPublic();

    List<CampaignEntity> findByIsDemoTrue();

    @Query("SELECT c FROM CampaignEntity c WHERE c.isDemo = true AND c.id = ?1")
    Optional<CampaignEntity> findDemoById(Long id);
}
