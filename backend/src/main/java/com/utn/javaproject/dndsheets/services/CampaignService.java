package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CampaignService {
    private CampaignRepository campaignRepository;

    public CampaignService(CampaignRepository campaignRepository) {

        this.campaignRepository = campaignRepository;
    }

    public CampaignEntity save(CampaignEntity campaign){
        return campaignRepository.save(campaign);
    }

    public List<CampaignEntity> findAll() {
        return new ArrayList<>(campaignRepository.findAll());
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
            Optional.ofNullable(campaignEntity.getDm()).ifPresent(existingCampaign::setDm);
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
}
