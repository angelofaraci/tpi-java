package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.dto.CampaignSummaryDto;
import com.utn.javaproject.dndsheets.domain.dto.PlayerCampaignSummaryDto;
import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CampaignService {
    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;
    private final CharacterRepository characterRepository;

    public CampaignService(CampaignRepository campaignRepository, UserRepository userRepository, CharacterRepository characterRepository) {
        this.campaignRepository = campaignRepository;
        this.userRepository = userRepository;
        this.characterRepository = characterRepository;
    }

    public CampaignEntity createCampaign(String username, CampaignEntity campaign) {
        campaign.setDm(resolveDmByUsername(username));
        campaign.setJoinCode(generateUniqueJoinCode());
        return campaignRepository.save(campaign);
    }

    public CampaignEntity save(CampaignEntity campaign){
        if (campaign.getDm() != null && campaign.getDm().getId() != null) {
            campaign.setDm(resolveDmById(campaign.getDm().getId()));
        }
        return campaignRepository.save(campaign);
    }

    public List<CampaignEntity> findAll() {
        return new ArrayList<>(campaignRepository.findAllPublic());
    }

    /**
     * Returns true if the given username is the DM of this campaign.
     */
    public boolean isDm(CampaignEntity campaign, String username) {
        if (campaign.getDm() == null) return false;
        return userRepository.findByUsername(username)
                .map(user -> campaign.getDm().getId().equals(user.getId()))
                .orElse(false);
    }

    /**
     * Returns true if the given username can access the campaign detail.
     * Access is granted when:
     *   - the campaign is public, OR
     *   - the user is the DM, OR
     *   - the user is already a player (has a character assigned to this campaign)
     */
    public boolean canAccess(CampaignEntity campaign, String username) {
        if (campaign.getPrivacy() == null || !campaign.getPrivacy()) {
            return true;
        }
        return userRepository.findByUsername(username).map(user -> {
            if (campaign.getDm() != null && campaign.getDm().getId().equals(user.getId())) {
                return true;
            }
            if (campaign.getPlayers() != null) {
                return campaign.getPlayers().stream().anyMatch(p -> p.getId().equals(user.getId()));
            }
            return false;
        }).orElse(false);
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

    @Transactional(readOnly = true)
    public List<PlayerCampaignSummaryDto> findPlayerCampaignSummaries(String username) {
        return userRepository.findByUsername(username)
                .map(user -> characterRepository.findByUserId(user.getId())
                        .stream()
                        .filter(character -> character.getCampaign() != null)
                        .map(character -> {
                            PlayerCampaignSummaryDto dto = new PlayerCampaignSummaryDto();
                            dto.setCampaignId(character.getCampaign().getId());
                            dto.setCampaignName(character.getCampaign().getName());
                            dto.setCampaignDescription(character.getCampaign().getDescription());
                            dto.setPrivacy(character.getCampaign().getPrivacy());
                            dto.setCreationDate(character.getCampaign().getCreationDate());
                            dto.setCharacterId(character.getId());
                            dto.setCharacterName(character.getName());
                            return dto;
                        })
                        .toList())
                .orElse(List.of());
    }

    public Optional<CampaignEntity> findByCode(String code) {
        return campaignRepository.findByJoinCode(code.trim().toUpperCase());
    }

    private CampaignSummaryDto mapToSummary(CampaignEntity campaignEntity) {
        CampaignSummaryDto summaryDto = new CampaignSummaryDto();
        summaryDto.setId(campaignEntity.getId());
        summaryDto.setJoinCode(campaignEntity.getJoinCode());
        summaryDto.setName(campaignEntity.getName());
        summaryDto.setDescription(campaignEntity.getDescription());
        summaryDto.setPrivacy(campaignEntity.getPrivacy());
        summaryDto.setCreationDate(campaignEntity.getCreationDate());
        return summaryDto;
    }

    private String generateUniqueJoinCode() {
        String code;
        do {
            // Genera algo como "A3F9-B72C" — 8 caracteres en dos grupos
            String raw = UUID.randomUUID().toString().replace("-", "").toUpperCase();
            code = raw.substring(0, 4) + "-" + raw.substring(4, 8);
        } while (campaignRepository.findByJoinCode(code).isPresent());
        return code;
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
