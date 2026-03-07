package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;
import com.utn.javaproject.dndsheets.domain.entities.LevelKey;
import com.utn.javaproject.dndsheets.domain.entities.RaceEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.DndClassRepository;
import com.utn.javaproject.dndsheets.repositories.LevelRepository;
import com.utn.javaproject.dndsheets.repositories.RaceRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import com.utn.javaproject.dndsheets.services.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CharacterCreateEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private RaceRepository raceRepository;

    @Autowired
    private DndClassRepository dndClassRepository;

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private LevelRepository levelRepository;

    @Autowired
    private JwtService jwtService;

    @Test
    void createCharacter_withOneInitialClass_persistsSingleLevelRow() throws Exception {
        UserEntity user = createUser("single-class-user");
        CampaignEntity campaign = createCampaign(user, "single-class-campaign");
        RaceEntity race = createRace("single-class-race");
        Long wizardClassId = classIdByName("Wizard");
        String characterName = "single-class-character";

        mockMvc.perform(post("/characters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user))
                        .content(createCharacterRequest(characterName, user.getId(), campaign.getId(), race.getId(),
                                """
                                        [
                                          { "classId": %d, "level": 3 }
                                        ]
                                        """.formatted(wizardClassId), null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value(characterName));

        CharacterEntity persistedCharacter = persistedCharacterNamed(characterName);
        List<LevelEntity> persistedLevels = levelRepository.findByIdCharacterId(persistedCharacter.getId());

        assertEquals(1, persistedLevels.size());
        assertEquals(wizardClassId, persistedLevels.getFirst().getId().getClassId());
        assertEquals((short) 3, persistedLevels.getFirst().getLevel());
    }

    @Test
    void createCharacter_withTwoInitialClasses_persistsTwoDistinctLevelRows() throws Exception {
        UserEntity user = createUser("two-class-user");
        CampaignEntity campaign = createCampaign(user, "two-class-campaign");
        RaceEntity race = createRace("two-class-race");
        Long wizardClassId = classIdByName("Wizard");
        Long fighterClassId = classIdByName("Fighter");
        String characterName = "two-class-character";

        mockMvc.perform(post("/characters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user))
                        .content(createCharacterRequest(characterName, user.getId(), campaign.getId(), race.getId(),
                                """
                                        [
                                          { "classId": %d, "level": 3 },
                                          { "classId": %d, "level": 2 }
                                        ]
                                        """.formatted(wizardClassId, fighterClassId), null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value(characterName));

        CharacterEntity persistedCharacter = persistedCharacterNamed(characterName);
        List<LevelEntity> persistedLevels = levelRepository.findByIdCharacterId(persistedCharacter.getId());

        assertEquals(2, persistedLevels.size());
        assertTrue(levelRepository.findById(new LevelKey(persistedCharacter.getId(), wizardClassId)).isPresent());
        assertTrue(levelRepository.findById(new LevelKey(persistedCharacter.getId(), fighterClassId)).isPresent());
        assertEquals((short) 3, levelRepository.findById(new LevelKey(persistedCharacter.getId(), wizardClassId)).orElseThrow().getLevel());
        assertEquals((short) 2, levelRepository.findById(new LevelKey(persistedCharacter.getId(), fighterClassId)).orElseThrow().getLevel());
    }

    @Test
    void createCharacter_rejectsMixedPreferredAndLegacyInitialClassShapes() throws Exception {
        UserEntity user = createUser("mixed-shape-user");
        CampaignEntity campaign = createCampaign(user, "mixed-shape-campaign");
        RaceEntity race = createRace("mixed-shape-race");
        Long wizardClassId = classIdByName("Wizard");
        String characterName = "mixed-shape-character";

        assertRejectedWithoutPersistence(
                user,
                characterName,
                createCharacterRequest(characterName, user.getId(), campaign.getId(), race.getId(),
                        """
                                [
                                  { "classId": %d, "level": 2 }
                                ]
                                """.formatted(wizardClassId),
                        """
                                [%d]
                                """.formatted(wizardClassId))
        );
    }

    @Test
    void createCharacter_rejectsDuplicatePreferredClassIds() throws Exception {
        UserEntity user = createUser("duplicate-class-user");
        CampaignEntity campaign = createCampaign(user, "duplicate-class-campaign");
        RaceEntity race = createRace("duplicate-class-race");
        Long wizardClassId = classIdByName("Wizard");
        String characterName = "duplicate-class-character";

        assertRejectedWithoutPersistence(
                user,
                characterName,
                createCharacterRequest(characterName, user.getId(), campaign.getId(), race.getId(),
                        """
                                [
                                  { "classId": %d, "level": 3 },
                                  { "classId": %d, "level": 1 }
                                ]
                                """.formatted(wizardClassId, wizardClassId), null)
        );
    }

    @Test
    void createCharacter_rejectsMoreThanTwoPreferredInitialClasses() throws Exception {
        UserEntity user = createUser("too-many-classes-user");
        CampaignEntity campaign = createCampaign(user, "too-many-classes-campaign");
        RaceEntity race = createRace("too-many-classes-race");
        Long wizardClassId = classIdByName("Wizard");
        Long fighterClassId = classIdByName("Fighter");
        Long rogueClassId = classIdByName("Rogue");
        String characterName = "too-many-classes-character";

        assertRejectedWithoutPersistence(
                user,
                characterName,
                createCharacterRequest(characterName, user.getId(), campaign.getId(), race.getId(),
                        """
                                [
                                  { "classId": %d, "level": 3 },
                                  { "classId": %d, "level": 2 },
                                  { "classId": %d, "level": 1 }
                                ]
                                """.formatted(wizardClassId, fighterClassId, rogueClassId), null)
        );
    }

    @Test
    void createCharacter_rejectsInvalidInitialClassLevels() throws Exception {
        UserEntity user = createUser("invalid-level-user");
        CampaignEntity campaign = createCampaign(user, "invalid-level-campaign");
        RaceEntity race = createRace("invalid-level-race");
        Long wizardClassId = classIdByName("Wizard");
        String characterName = "invalid-level-character";

        assertRejectedWithoutPersistence(
                user,
                characterName,
                createCharacterRequest(characterName, user.getId(), campaign.getId(), race.getId(),
                        """
                                [
                                  { "classId": %d, "level": 0 }
                                ]
                                """.formatted(wizardClassId), null)
        );
    }

    @Test
    void createCharacter_acceptsLegacyInitialClassIdsOnlyWhenPreferredShapeIsAbsent() throws Exception {
        UserEntity user = createUser("legacy-class-user");
        CampaignEntity campaign = createCampaign(user, "legacy-class-campaign");
        RaceEntity race = createRace("legacy-class-race");
        Long wizardClassId = classIdByName("Wizard");
        Long fighterClassId = classIdByName("Fighter");
        String characterName = "legacy-class-character";

        mockMvc.perform(post("/characters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user))
                        .content(createCharacterRequest(characterName, user.getId(), campaign.getId(), race.getId(), null,
                                """
                                        [%d, %d]
                                        """.formatted(wizardClassId, fighterClassId))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value(characterName));

        CharacterEntity persistedCharacter = persistedCharacterNamed(characterName);
        assertEquals((short) 1, levelRepository.findById(new LevelKey(persistedCharacter.getId(), wizardClassId)).orElseThrow().getLevel());
        assertEquals((short) 1, levelRepository.findById(new LevelKey(persistedCharacter.getId(), fighterClassId)).orElseThrow().getLevel());
    }

    private void assertRejectedWithoutPersistence(UserEntity user, String characterName, String body) throws Exception {
        long characterCountBefore = characterRepository.count();
        long levelCountBefore = levelRepository.count();

        mockMvc.perform(post("/characters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user))
                        .content(body))
                .andExpect(status().isBadRequest());

        assertEquals(characterCountBefore, characterRepository.count());
        assertEquals(levelCountBefore, levelRepository.count());
        assertFalse(characterRepository.findAll().stream().anyMatch(character -> characterName.equals(character.getName())));
    }

    private String createCharacterRequest(String characterName,
                                          Long userId,
                                          Long campaignId,
                                          Long raceId,
                                          String initialClassesJson,
                                          String initialClassIdsJson) {
        String initialClassesSection = initialClassesJson == null ? "" : ",\n  \"initialClasses\": " + initialClassesJson;
        String initialClassIdsSection = initialClassIdsJson == null ? "" : ",\n  \"initialClassIds\": " + initialClassIdsJson;

        return """
                {
                  "user": { "id": %d },
                  "campaign": { "id": %d },
                  "name": "%s",
                  "characteristics": ["Darkvision"],
                  "alignment": "Neutral Good",
                  "background": "Sage",
                  "race": { "id": %d }%s%s
                }
                """.formatted(userId, campaignId, characterName, raceId, initialClassesSection, initialClassIdsSection);
    }

    private UserEntity createUser(String prefix) {
        return userRepository.save(UserEntity.builder()
                .username(prefix + "-name")
                .email(prefix + "@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());
    }

    private CampaignEntity createCampaign(UserEntity dm, String name) {
        return campaignRepository.save(CampaignEntity.builder()
                .dm(dm)
                .name(name)
                .description("character create test campaign")
                .privacy(false)
                .players(List.of())
                .characters(List.of())
                .build());
    }

    private RaceEntity createRace(String name) {
        return raceRepository.save(RaceEntity.builder()
                .name(name)
                .description("character create test race")
                .racialFeats(List.of("Darkvision"))
                .build());
    }

    private Long classIdByName(String name) {
        return dndClassRepository.findByName(name)
                .map(DndClassEntity::getId)
                .orElseThrow(() -> new AssertionError("Seeded class '%s' not found".formatted(name)));
    }

    private CharacterEntity persistedCharacterNamed(String name) {
        Optional<CharacterEntity> persisted = characterRepository.findAll().stream()
                .filter(character -> name.equals(character.getName()))
                .findFirst();

        return persisted.orElseThrow(() -> new AssertionError("Character '%s' was not persisted".formatted(name)));
    }

    private String bearerTokenFor(UserEntity user) {
        return "Bearer " + jwtService.getToken(user);
    }
}
