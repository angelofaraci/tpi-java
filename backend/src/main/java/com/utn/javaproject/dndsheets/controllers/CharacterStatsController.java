package com.utn.javaproject.dndsheets.controllers;

import com.utn.javaproject.dndsheets.domain.dto.CharacterStatsDto;
import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import com.utn.javaproject.dndsheets.services.CharacterService;
import com.utn.javaproject.dndsheets.services.CharacterStatsService;
import com.utn.javaproject.dndsheets.services.CharacterCreateRequestValidator;
import com.utn.javaproject.dndsheets.services.LevelService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import com.utn.javaproject.dndsheets.domain.entities.LevelKey;
import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@RestController
public class CharacterStatsController {

    private final Mapper<CharacterStatsEntity, CharacterStatsDto> characterStatsMapper;
    private final CharacterStatsService characterStatsService;
    private final CharacterCreateRequestValidator characterCreateRequestValidator;
    private final LevelService levelService;
    private final CharacterService characterService;

    public CharacterStatsController(Mapper<CharacterStatsEntity, CharacterStatsDto> characterStatsMapper,
                                    CharacterStatsService characterStatsService,
                                    CharacterCreateRequestValidator characterCreateRequestValidator,
                                    LevelService levelService,
                                    CharacterService characterService) {
        this.characterStatsMapper = characterStatsMapper;
        this.characterStatsService = characterStatsService;
        this.characterCreateRequestValidator = characterCreateRequestValidator;
        this.levelService = levelService;
        this.characterService = characterService;
    }

    @PostMapping(path = "/character-stats")
    public ResponseEntity<CharacterStatsDto> createCharacterStats(@RequestBody CharacterStatsDto characterStatsDto) {
        try {
            characterCreateRequestValidator.validateAbilityScores(characterStatsDto.getAbilityScores());
        } catch (IllegalArgumentException exception) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        CharacterStatsEntity characterStatsEntity = characterStatsMapper.mapFrom(characterStatsDto);

        Set<String> requiredProficiencies = Set.of(
            "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History",
            "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception",
            "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival",
            "Strength", "Dexterity", "Constitution", "Wisdom", "Intelligence", "Charisma"
        );
        if (characterStatsEntity.getProficiencies() == null ||
            !characterStatsEntity.getProficiencies().keySet().equals(requiredProficiencies)) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        for (Short value : characterStatsEntity.getProficiencies().values()) {
            if (value == null || (value != 0 && value != 1 && value != 2)) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
        }

        CharacterStatsEntity savedCharacterStatsEntity = characterStatsService.save(characterStatsEntity);
        CharacterStatsDto savedCharacterStatsDto = characterStatsMapper.mapTo(savedCharacterStatsEntity);
        return new ResponseEntity<>(savedCharacterStatsDto, HttpStatus.CREATED);
    }

    @GetMapping(path = "/character-stats")
    public List<CharacterStatsDto> listCharacterStats() {
        List<CharacterStatsEntity> characterStats = characterStatsService.findAll();
        return characterStats.stream().map(characterStatsMapper::mapTo).toList();
    }

    @GetMapping(path = "/character-stats/{id}")
    public ResponseEntity<CharacterStatsDto> getCharacterStats(@PathVariable("id") Long id) {
        Optional<CharacterStatsEntity> foundCharacterStats = characterStatsService.findOne(id);
        return foundCharacterStats.map(characterStatsEntity -> {
            CharacterStatsDto characterStatsDto = characterStatsMapper.mapTo(characterStatsEntity);
            return new ResponseEntity<>(characterStatsDto, HttpStatus.OK);
        }).orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping(path = "character-stats/{id}")
    public ResponseEntity<CharacterStatsDto> fullUpdateCharacterStats(
            @PathVariable("id") Long id,
            @RequestBody CharacterStatsDto characterStatsDto,
            @AuthenticationPrincipal UserDetails principal) {

        Optional<CharacterStatsEntity> found = characterStatsService.findOne(id);
        if (found.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        if (principal == null || !characterService.canEdit(found.get().getCharacter(), principal.getUsername())) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }

        characterStatsDto.setId(id);
        CharacterStatsEntity characterStatsEntity = characterStatsMapper.mapFrom(characterStatsDto);
        // CharacterStatsDto has no "character" field, so it cannot legitimately carry one — but
        // ModelMapper's default matching strategy spuriously maps the DTO's top-level "id" onto
        // the entity's unmatched nested "character.id" path (both leaf-named "id"), silently
        // corrupting the character-stats -> character association with a bogus reference on
        // every PUT. Character is immutable after creation (mirrors the same fix already applied
        // to campaign in CharacterController#fullUpdateCharacter) — always preserve the existing
        // association instead of trusting the mapper's guess.
        characterStatsEntity.setCharacter(found.get().getCharacter());
        CharacterStatsEntity savedEntity = characterStatsService.save(characterStatsEntity);
        return new ResponseEntity<>(characterStatsMapper.mapTo(savedEntity), HttpStatus.OK);
    }

    @PatchMapping(path = "character-stats/{id}")
    public ResponseEntity<CharacterStatsDto> partialUpdate(
            @PathVariable("id") Long id,
            @RequestBody CharacterStatsDto characterStatsDto,
            @AuthenticationPrincipal UserDetails principal) {

        Optional<CharacterStatsEntity> found = characterStatsService.findOne(id);
        if (found.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        if (principal == null || !characterService.canEdit(found.get().getCharacter(), principal.getUsername())) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }

        if (characterStatsDto.getAbilityScores() != null) {
            try {
                characterCreateRequestValidator.validateAbilityScores(characterStatsDto.getAbilityScores());
            } catch (IllegalArgumentException exception) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
        }

        CharacterStatsEntity characterStatsEntity = characterStatsMapper.mapFrom(characterStatsDto);
        // Same spurious-mapping hazard as fullUpdateCharacterStats above — pin the association to
        // the already-verified owner before any partial-update field copying can see it.
        characterStatsEntity.setCharacter(found.get().getCharacter());
        CharacterStatsEntity updatedCharacterStats = characterStatsService.partialUpdate(id, characterStatsEntity);
        return new ResponseEntity<>(characterStatsMapper.mapTo(updatedCharacterStats), HttpStatus.OK);
    }

    @DeleteMapping(path = "character-stats/{id}")
    public ResponseEntity<Void> deleteCharacterStats(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetails principal) {

        Optional<CharacterStatsEntity> found = characterStatsService.findOne(id);
        if (found.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        if (principal == null || !characterService.canEdit(found.get().getCharacter(), principal.getUsername())) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }

        characterStatsService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PutMapping(path = "character-stats/{id}/{classId}")
    public ResponseEntity<CharacterStatsDto> updateCharacterHp(
            @PathVariable("id") Long characterStatsId,
            @PathVariable("classId") Long classId,
            @AuthenticationPrincipal UserDetails principal) {
        Optional<CharacterStatsEntity> foundCharacterStats = characterStatsService.findOne(characterStatsId);
        if (foundCharacterStats.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        CharacterStatsEntity characterStatsEntity = foundCharacterStats.get();

        if (principal == null || !characterService.canEdit(characterStatsEntity.getCharacter(), principal.getUsername())) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
        Optional<LevelEntity> characterLevelOptional = levelService.findOne(
                new LevelKey(characterStatsEntity.getCharacter().getId(), classId)
        );
        if (characterLevelOptional.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        LevelEntity characterLevel = characterLevelOptional.get();
        Short constitutionScore = characterStatsEntity.getAbilityScores().get("Constitution");
        int constitutionModifier = Math.floorDiv(constitutionScore - 10, 2);
        int level = characterLevel.getLevel();
        int hitDice = characterLevel.getDndClass().getHitDice();
        characterStatsEntity.setHp((level - 1) * (constitutionModifier + hitDice));

        CharacterStatsEntity updatedCharacterStats = characterStatsService.save(characterStatsEntity);
        return new ResponseEntity<>(characterStatsMapper.mapTo(updatedCharacterStats), HttpStatus.OK);
    }
}
