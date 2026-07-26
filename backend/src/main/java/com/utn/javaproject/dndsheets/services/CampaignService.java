package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.dto.CampaignSummaryDto;
import com.utn.javaproject.dndsheets.domain.dto.PlayerCampaignSummaryDto;
import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
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

    /** Returns ALL campaigns regardless of privacy — for admin use only. */
    public List<CampaignEntity> findAllForAdmin() {
        return new ArrayList<>(campaignRepository.findAll());
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
     *   - the user is already a player (has a character assigned to this campaign), OR
     *   - the user is the owner of a character associated with this campaign
     */
    @Transactional(readOnly = true)
    public boolean canAccess(CampaignEntity campaign, String username) {
        if (campaign.getPrivacy() == null || !campaign.getPrivacy()) {
            return true;
        }
        return userRepository.findByUsername(username).map(user -> {
            if (campaign.getDm() != null && campaign.getDm().getId().equals(user.getId())) {
                return true;
            }
            if (campaign.getPlayers() != null &&
                    campaign.getPlayers().stream().anyMatch(p -> p.getId().equals(user.getId()))) {
                return true;
            }
            // Character owner check (NEW)
            if (campaign.getCharacters() != null) {
                return campaign.getCharacters().stream()
                        .anyMatch(c -> c.getUser() != null && c.getUser().getId().equals(user.getId()));
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
                            CampaignEntity campaign = character.getCampaign();
                            PlayerCampaignSummaryDto dto = new PlayerCampaignSummaryDto();
                            dto.setCampaignId(campaign.getId());
                            dto.setCampaignName(campaign.getName());
                            dto.setCampaignDescription(campaign.getDescription());
                            dto.setPrivacy(campaign.getPrivacy());
                            dto.setCreationDate(campaign.getCreationDate());
                            dto.setCharacterId(character.getId());
                            dto.setCharacterName(character.getName());
                            dto.setPlayerCount(countUniquePlayers(campaign));
                            dto.setCharacterCount(countCharacters(campaign));
                            return dto;
                        })
                        .toList())
                .orElse(List.of());
    }

    public Optional<CampaignEntity> findByCode(String code) {
        return campaignRepository.findByJoinCode(code.trim().toUpperCase());
    }

    /**
     * Resolves the deduped union of a campaign's players: explicit {@code campaign_players}
     * join-table rows, plus users derived from {@code characters[].user} (covers a DM — or any
     * user — who owns a character in the campaign but has no explicit join-table row), deduped
     * by user id. Explicit players are listed first, in their original order.
     *
     * This is the single source of truth for "who plays in this campaign" — both the campaign
     * detail view ({@code GET /campaign/{id}}) and the list endpoints ({@code GET /campaigns/mine},
     * {@code GET /campaigns/as-player}) MUST derive their player counts from this method so the
     * numbers always agree (spec: "Backend Count Contract").
     */
    @Transactional(readOnly = true)
    public List<UserEntity> resolveUniquePlayers(CampaignEntity campaign) {
        List<UserEntity> explicitPlayers = campaign.getPlayers() == null ? List.of() : campaign.getPlayers();

        List<UserEntity> characterOwners = campaign.getCharacters() == null
                ? List.of()
                : campaign.getCharacters().stream()
                        .map(CharacterEntity::getUser)
                        .filter(Objects::nonNull)
                        .toList();

        Set<Long> seenIds = new LinkedHashSet<>();
        List<UserEntity> uniquePlayers = new ArrayList<>();
        for (UserEntity user : explicitPlayers) {
            if (seenIds.add(user.getId())) uniquePlayers.add(user);
        }
        for (UserEntity user : characterOwners) {
            if (seenIds.add(user.getId())) uniquePlayers.add(user);
        }
        return uniquePlayers;
    }

    public int countUniquePlayers(CampaignEntity campaign) {
        return resolveUniquePlayers(campaign).size();
    }

    public int countCharacters(CampaignEntity campaign) {
        return campaign.getCharacters() == null ? 0 : campaign.getCharacters().size();
    }

    private CampaignSummaryDto mapToSummary(CampaignEntity campaignEntity) {
        CampaignSummaryDto summaryDto = new CampaignSummaryDto();
        summaryDto.setId(campaignEntity.getId());
        summaryDto.setJoinCode(campaignEntity.getJoinCode());
        summaryDto.setName(campaignEntity.getName());
        summaryDto.setDescription(campaignEntity.getDescription());
        summaryDto.setPrivacy(campaignEntity.getPrivacy());
        summaryDto.setCreationDate(campaignEntity.getCreationDate());
        summaryDto.setPlayerCount(countUniquePlayers(campaignEntity));
        summaryDto.setCharacterCount(countCharacters(campaignEntity));
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
