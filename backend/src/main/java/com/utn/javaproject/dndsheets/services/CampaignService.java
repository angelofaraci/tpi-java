package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.dto.CampaignSummaryDto;
import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CampaignService {
    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;

    public CampaignService(CampaignRepository campaignRepository, UserRepository userRepository) {
        this.campaignRepository = campaignRepository;
        this.userRepository = userRepository;
    }

    public CampaignEntity createCampaign(String username, CampaignEntity campaign) {
        campaign.setDm(resolveDmByUsername(username));
        return campaignRepository.save(campaign);
    }

    public CampaignEntity save(CampaignEntity campaign){
        if (campaign.getDm() != null && campaign.getDm().getId() != null) {
            campaign.setDm(resolveDmById(campaign.getDm().getId()));
        }
        return campaignRepository.save(campaign);
    }

    public List<CampaignEntity> findAll() {
        return new ArrayList<>(campaignRepository.findAll());
    }

    @Transactional(readOnly = true)
    public List<CampaignSummaryDto> findOwnedCampaignSummaries(String username) {
        return userRepository.findByUsername(username)
                .map(user -> campaignRepository.findAllByDmIdOrderByCreationDateDesc(user.getId())
                        .stream()
                        .map(this::mapToSummary)
                        .toList())
                .orElse(List.of());
    }

    public Optional<CampaignEntity> findOne(Long id) {
        return campaignRepository.findById(id);
    }

    public boolean isExists(Long id) {
        return campaignRepository.existsById(id);
    }

    public CampaignEntity partialUpdate(Long id, CampaignEntity campaignEntity) {
        campaignEntity.setId(id);

        return campaignRepository.findById(id).map(existingCampaign -> {
            if (campaignEntity.getDm() != null) {
                if (campaignEntity.getDm().getId() != null) {
                    existingCampaign.setDm(resolveDmById(campaignEntity.getDm().getId()));
                } else {
                    existingCampaign.setDm(campaignEntity.getDm());
                }
            }
            Optional.ofNullable(campaignEntity.getName()).ifPresent(existingCampaign::setName);
            Optional.ofNullable(campaignEntity.getDescription()).ifPresent(existingCampaign::setDescription);
            Optional.ofNullable(campaignEntity.getPrivacy()).ifPresent(existingCampaign::setPrivacy);
            Optional.ofNullable(campaignEntity.getCreationDate()).ifPresent(existingCampaign::setCreationDate);
            Optional.ofNullable(campaignEntity.getPlayers()).ifPresent(existingCampaign::setPlayers);
            Optional.ofNullable(campaignEntity.getCharacters()).ifPresent(existingCampaign::setCharacters);

            return campaignRepository.save(existingCampaign);
        }).orElseThrow(() -> new RuntimeException("Campaign does not exist"));

    }

    public void delete(Long id) {
        campaignRepository.deleteById(id);
    }

    private CampaignSummaryDto mapToSummary(CampaignEntity campaignEntity) {
        CampaignSummaryDto summaryDto = new CampaignSummaryDto();
        summaryDto.setId(campaignEntity.getId());
        summaryDto.setName(campaignEntity.getName());
        summaryDto.setDescription(campaignEntity.getDescription());
        summaryDto.setPrivacy(campaignEntity.getPrivacy());
        summaryDto.setCreationDate(campaignEntity.getCreationDate());
        summaryDto.setPlayerCount(campaignEntity.getPlayers() == null ? 0 : campaignEntity.getPlayers().size());
        return summaryDto;
    }

    private com.utn.javaproject.dndsheets.domain.entities.UserEntity resolveDmById(Long dmId) {
        return userRepository.findById(dmId)
                .orElseThrow(() -> new RuntimeException("DM user does not exist"));
    }

    private com.utn.javaproject.dndsheets.domain.entities.UserEntity resolveDmByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Authenticated user does not exist"));
    }
}
