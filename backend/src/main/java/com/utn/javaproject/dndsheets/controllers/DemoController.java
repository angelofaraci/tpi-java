package com.utn.javaproject.dndsheets.controllers;

import com.utn.javaproject.dndsheets.domain.dto.DemoCampaignDetailDto;
import com.utn.javaproject.dndsheets.domain.dto.DemoCampaignDto;
import com.utn.javaproject.dndsheets.domain.dto.DemoCharacterDetailDto;
import com.utn.javaproject.dndsheets.domain.dto.DemoCharacterSummaryDto;
import com.utn.javaproject.dndsheets.services.DemoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public, GET-only, read-only endpoints exposing the seeded demo dataset to
 * anonymous visitors. Never serializes entities directly — only the
 * purpose-built {@code Demo*Dto} classes are returned. Matched exactly (no
 * wildcard) and permitted anonymously in {@link com.utn.javaproject.dndsheets.config.SecurityConfig}.
 */
@RestController
public class DemoController {

    private final DemoService demoService;

    public DemoController(DemoService demoService) {
        this.demoService = demoService;
    }

    @GetMapping(path = "/demo/campaigns")
    public List<DemoCampaignDto> listDemoCampaigns() {
        return demoService.listCampaigns();
    }

    @GetMapping(path = "/demo/characters")
    public List<DemoCharacterSummaryDto> listDemoCharacters() {
        return demoService.listCharacters();
    }

    @GetMapping(path = "/demo/characters/{id}")
    public ResponseEntity<DemoCharacterDetailDto> getDemoCharacter(@PathVariable("id") Long id) {
        return demoService.findCharacterDetail(id)
                .map(dto -> new ResponseEntity<>(dto, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping(path = "/demo/campaigns/{id}")
    public ResponseEntity<DemoCampaignDetailDto> getDemoCampaign(@PathVariable("id") Long id) {
        return demoService.findCampaignDetail(id)
                .map(dto -> new ResponseEntity<>(dto, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }
}
