package com.utn.javaproject.dndsheets.controllers;


import com.utn.javaproject.dndsheets.domain.dto.CampaignDetailDto;
import com.utn.javaproject.dndsheets.domain.dto.CampaignDto;
import com.utn.javaproject.dndsheets.domain.dto.CampaignSummaryDto;
import com.utn.javaproject.dndsheets.domain.dto.PlayerCampaignSummaryDto;
import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import com.utn.javaproject.dndsheets.services.CampaignService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
public class CampaignController {

    private final Mapper<CampaignEntity, CampaignDto> campaignMapper;

    private final CampaignService campaignService;

    public CampaignController(Mapper<CampaignEntity, CampaignDto> campaignMapper, CampaignService campaignService) {
        this.campaignMapper = campaignMapper;
        this.campaignService = campaignService;
    }

    @PostMapping(path = "/campaigns")
    public ResponseEntity<CampaignDto> createCampaign(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody CampaignDto campaignDto
    ) {
        if (principal == null || principal.getUsername() == null) {
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
        }

        CampaignEntity campaignEntity = campaignMapper.mapFrom(campaignDto);
        CampaignEntity savedCampaignEntity = campaignService.createCampaign(principal.getUsername(), campaignEntity);
        CampaignDto savedCampaignDto = campaignMapper.mapTo(savedCampaignEntity);
        return new ResponseEntity<>(savedCampaignDto, HttpStatus.CREATED);


    }

    @GetMapping(path = "/campaigns")
    public List<CampaignDto> listCampaigns() {
        List<CampaignEntity> campaigns = campaignService.findAll();
        return campaigns.stream().map(campaignMapper::mapTo).toList();
    }

    @GetMapping(path = "/campaigns/mine")
    public ResponseEntity<List<CampaignSummaryDto>> listOwnedCampaigns(@AuthenticationPrincipal UserDetails principal) {
        if (principal == null || principal.getUsername() == null) {
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
        }

        return new ResponseEntity<>(campaignService.findOwnedCampaignSummaries(principal.getUsername()), HttpStatus.OK);
    }

    @GetMapping(path = "/campaigns/by-code/{code}")
    public ResponseEntity<CampaignDto> getCampaignByCode(@PathVariable("code") String code) {
        return campaignService.findByCode(code)
                .map(entity -> new ResponseEntity<>(campaignMapper.mapTo(entity), HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping(path = "/campaigns/as-player")
    public ResponseEntity<List<PlayerCampaignSummaryDto>> listPlayerCampaigns(@AuthenticationPrincipal UserDetails principal) {
        if (principal == null || principal.getUsername() == null) {
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
        }

        return new ResponseEntity<>(campaignService.findPlayerCampaignSummaries(principal.getUsername()), HttpStatus.OK);
    }

    @GetMapping(path = "/campaign/{id}")
    public ResponseEntity<CampaignDetailDto> getCampaign(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetails principal
    ) {
        Optional<CampaignEntity> foundCampaign = campaignService.findOne(id);
        if (foundCampaign.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        CampaignEntity entity = foundCampaign.get();
        String username = principal != null ? principal.getUsername() : null;
        if (username == null || !campaignService.canAccess(entity, username)) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
        boolean isDm = username != null && campaignService.isDm(entity, username);
        return new ResponseEntity<>(mapToDetail(entity, isDm), HttpStatus.OK);
    }

    @PutMapping(path = "campaign/{id}")
    public ResponseEntity<CampaignDto> fullUpdateCampaign(
            @PathVariable("id") Long id,
            @RequestBody CampaignDto campaignDto){

        if(!campaignService.isExists(id)){
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        campaignDto.setId(id);
        CampaignEntity campaignEntity = campaignMapper.mapFrom(campaignDto);
        CampaignEntity savedEntity = campaignService.save(campaignEntity);
        return new ResponseEntity<>(campaignMapper.mapTo(savedEntity), HttpStatus.OK);
    }

    @PatchMapping(path = "campaign/{id}")
    public ResponseEntity<CampaignDto> partialUpdate(
            @PathVariable("id") Long id,
            @RequestBody CampaignDto campaignDto
    ){
        if(!campaignService.isExists(id)){
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        CampaignEntity campaignEntity = campaignMapper.mapFrom(campaignDto);
        CampaignEntity updatedCampaign = campaignService.partialUpdate(id, campaignEntity);
        return new ResponseEntity<>(campaignMapper.mapTo(updatedCampaign), HttpStatus.OK) ;
    }

    @DeleteMapping(path = "campaign/{id}")
    public ResponseEntity<?> deleteCampaign(@PathVariable("id") Long id){
        if (campaignService.hasCharacters(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Cannot delete a campaign that still has characters. Delete or reassign its characters first.");
        }
        campaignService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    // ---- private helpers ----

    private CampaignDetailDto mapToDetail(CampaignEntity entity, boolean includejoinCode) {
        // Reuse the same union logic the list endpoints use (CampaignService.resolveUniquePlayers)
        // so detail players.size() and list playerCount are guaranteed to agree (spec: "Backend
        // Count Contract" — parity with campaign detail view).
        List<CampaignDetailDto.CampaignPlayerDto> playerDtos = campaignService.resolveUniquePlayers(entity)
                .stream()
                .map(this::mapPlayer)
                .toList();

        List<CampaignDetailDto.CampaignCharacterDto> characterDtos = entity.getCharacters() == null
                ? List.of()
                : entity.getCharacters().stream().map(this::mapCharacter).toList();

        return CampaignDetailDto.builder()
                .id(entity.getId())
                .joinCode(includejoinCode ? entity.getJoinCode() : null)
                .name(entity.getName())
                .description(entity.getDescription())
                .privacy(entity.getPrivacy())
                .creationDate(entity.getCreationDate())
                .players(playerDtos)
                .characters(characterDtos)
                .build();
    }

    private CampaignDetailDto.CampaignPlayerDto mapPlayer(UserEntity user) {
        return CampaignDetailDto.CampaignPlayerDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }

    private CampaignDetailDto.CampaignCharacterDto mapCharacter(CharacterEntity character) {
        CampaignDetailDto.CampaignCharacterDto.RaceProjection race = character.getRace() == null ? null
                : CampaignDetailDto.CampaignCharacterDto.RaceProjection.builder()
                        .id(character.getRace().getId())
                        .name(character.getRace().getName())
                        .build();

        CampaignDetailDto.CampaignCharacterDto.UserProjection user = character.getUser() == null ? null
                : CampaignDetailDto.CampaignCharacterDto.UserProjection.builder()
                        .id(character.getUser().getId())
                        .username(character.getUser().getUsername())
                        .build();

        return CampaignDetailDto.CampaignCharacterDto.builder()
                .id(character.getId())
                .name(character.getName())
                .alignment(character.getAlignment())
                .background(character.getBackground())
                .race(race)
                .user(user)
                .build();
    }
}

