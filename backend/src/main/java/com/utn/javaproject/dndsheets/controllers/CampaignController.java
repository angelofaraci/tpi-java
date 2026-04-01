package com.utn.javaproject.dndsheets.controllers;


import com.utn.javaproject.dndsheets.domain.dto.CampaignDto;
import com.utn.javaproject.dndsheets.domain.dto.CampaignSummaryDto;
import com.utn.javaproject.dndsheets.domain.dto.PlayerCampaignSummaryDto;
import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
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
    public ResponseEntity<CampaignDto> getCampaign(@PathVariable("id") Long id){
        Optional<CampaignEntity> foundCampaign = campaignService.findOne(id);
        return foundCampaign.map(campaignEntity -> {
            CampaignDto campaignDto = campaignMapper.mapTo(campaignEntity);
            return new ResponseEntity<>(campaignDto, HttpStatus.OK);
        }).orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));

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
    public ResponseEntity deleteCampaign(@PathVariable("id") Long id){
        campaignService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
