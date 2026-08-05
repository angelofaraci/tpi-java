package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;
import com.utn.javaproject.dndsheets.domain.entities.LevelKey;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.DndClassRepository;
import com.utn.javaproject.dndsheets.repositories.LevelRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import com.utn.javaproject.dndsheets.services.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class LevelAuthorizationEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private DndClassRepository dndClassRepository;

    @Autowired
    private LevelRepository levelRepository;

    @Autowired
    private JwtService jwtService;

    // ─── helpers ───────────────────────────────────────────────────────────────

    private UserEntity savedUser(String prefix) {
        return userRepository.save(UserEntity.builder()
                .username(prefix + "-" + System.nanoTime())
                .email(prefix + "@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());
    }

    private CharacterEntity characterOwnedBy(UserEntity owner, String name) {
        return characterRepository.save(CharacterEntity.builder()
                .name(name)
                .user(owner)
                .build());
    }

    private CharacterEntity characterOwnedByInCampaign(UserEntity owner, CampaignEntity campaign, String name) {
        return characterRepository.save(CharacterEntity.builder()
                .name(name)
                .user(owner)
                .campaign(campaign)
                .build());
    }

    private CampaignEntity savedCampaign(UserEntity dm, String name) {
        return campaignRepository.save(CampaignEntity.builder()
                .dm(dm)
                .name(name)
                .description("description")
                .privacy(false)
                .creationDate(new Date())
                .players(List.of())
                .characters(List.of())
                .build());
    }

    private DndClassEntity barbarian() {
        return dndClassRepository.findByName("Barbarian")
                .orElseThrow(() -> new AssertionError("Seeded class 'Barbarian' not found"));
    }

    private LevelEntity savedLevel(CharacterEntity character, DndClassEntity dndClass, int level) {
        return levelRepository.save(LevelEntity.builder()
                .id(new LevelKey(character.getId(), dndClass.getId()))
                .character(character)
                .dndClass(dndClass)
                .level((short) level)
                .build());
    }

    private String bearer(UserEntity user) {
        return "Bearer " + jwtService.getToken(user);
    }

    // ─── PUT /level/{characterId}/{classId} ────────────────────────────────────

    @Test
    void putLevel_owner_returns200() throws Exception {
        UserEntity owner = savedUser("level-put-owner");
        CharacterEntity character = characterOwnedBy(owner, "put-owner-character");
        DndClassEntity dndClass = barbarian();
        savedLevel(character, dndClass, 1);

        mockMvc.perform(put("/level/{characterId}/{classId}", character.getId(), dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "level": 3 }
                                """))
                .andExpect(status().isOk());

        Optional<LevelEntity> reloaded = levelRepository.findById(new LevelKey(character.getId(), dndClass.getId()));
        assertTrue(reloaded.isPresent());
        assertEquals((short) 3, reloaded.get().getLevel());
    }

    @Test
    void putLevel_campaignDm_returns200() throws Exception {
        UserEntity dm = savedUser("level-put-dm");
        UserEntity player = savedUser("level-put-player");
        CampaignEntity campaign = savedCampaign(dm, "level-put-campaign");
        CharacterEntity character = characterOwnedByInCampaign(player, campaign, "put-dm-character");
        DndClassEntity dndClass = barbarian();
        savedLevel(character, dndClass, 1);

        mockMvc.perform(put("/level/{characterId}/{classId}", character.getId(), dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(dm))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "level": 4 }
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void putLevel_nonOwnerNonDm_returns403AndLeavesUnchanged() throws Exception {
        UserEntity owner = savedUser("level-put-real-owner");
        UserEntity other = savedUser("level-put-other-user");
        CharacterEntity character = characterOwnedBy(owner, "put-forbidden-character");
        DndClassEntity dndClass = barbarian();
        savedLevel(character, dndClass, 1);

        mockMvc.perform(put("/level/{characterId}/{classId}", character.getId(), dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "level": 9 }
                                """))
                .andExpect(status().isForbidden());

        Optional<LevelEntity> reloaded = levelRepository.findById(new LevelKey(character.getId(), dndClass.getId()));
        assertTrue(reloaded.isPresent());
        assertEquals((short) 1, reloaded.get().getLevel());
    }

    @Test
    void putLevel_missingCharacter_returns404() throws Exception {
        UserEntity user = savedUser("level-put-notfound-user");
        DndClassEntity dndClass = barbarian();

        mockMvc.perform(put("/level/{characterId}/{classId}", 999_999L, dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "level": 2 }
                                """))
                .andExpect(status().isNotFound());
    }

    // ─── PATCH /level/{characterId}/{classId} ──────────────────────────────────

    @Test
    void patchLevel_owner_returns200() throws Exception {
        UserEntity owner = savedUser("level-patch-owner");
        CharacterEntity character = characterOwnedBy(owner, "patch-owner-character");
        DndClassEntity dndClass = barbarian();
        savedLevel(character, dndClass, 1);

        mockMvc.perform(patch("/level/{characterId}/{classId}", character.getId(), dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "level": 5 }
                                """))
                .andExpect(status().isOk());

        Optional<LevelEntity> reloaded = levelRepository.findById(new LevelKey(character.getId(), dndClass.getId()));
        assertTrue(reloaded.isPresent());
        assertEquals((short) 5, reloaded.get().getLevel());
    }

    @Test
    void patchLevel_nonOwnerNonDm_returns403AndLeavesUnchanged() throws Exception {
        UserEntity owner = savedUser("level-patch-real-owner");
        UserEntity other = savedUser("level-patch-other-user");
        CharacterEntity character = characterOwnedBy(owner, "patch-forbidden-character");
        DndClassEntity dndClass = barbarian();
        savedLevel(character, dndClass, 1);

        mockMvc.perform(patch("/level/{characterId}/{classId}", character.getId(), dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "level": 9 }
                                """))
                .andExpect(status().isForbidden());

        Optional<LevelEntity> reloaded = levelRepository.findById(new LevelKey(character.getId(), dndClass.getId()));
        assertTrue(reloaded.isPresent());
        assertEquals((short) 1, reloaded.get().getLevel());
    }

    @Test
    void patchLevel_missingCharacter_returns404() throws Exception {
        UserEntity user = savedUser("level-patch-notfound-user");
        DndClassEntity dndClass = barbarian();

        mockMvc.perform(patch("/level/{characterId}/{classId}", 999_999L, dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "level": 2 }
                                """))
                .andExpect(status().isNotFound());
    }

    // ─── DELETE /level/{characterId}/{classId} ─────────────────────────────────

    @Test
    void deleteLevel_owner_returns204AndRemoves() throws Exception {
        UserEntity owner = savedUser("level-delete-owner");
        CharacterEntity character = characterOwnedBy(owner, "delete-owner-character");
        DndClassEntity dndClass = barbarian();
        savedLevel(character, dndClass, 1);

        mockMvc.perform(delete("/level/{characterId}/{classId}", character.getId(), dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isNoContent());

        assertTrue(levelRepository.findById(new LevelKey(character.getId(), dndClass.getId())).isEmpty());
    }

    @Test
    void deleteLevel_nonOwnerNonDm_returns403AndKeeps() throws Exception {
        UserEntity owner = savedUser("level-delete-real-owner");
        UserEntity other = savedUser("level-delete-other-user");
        CharacterEntity character = characterOwnedBy(owner, "delete-forbidden-character");
        DndClassEntity dndClass = barbarian();
        savedLevel(character, dndClass, 1);

        mockMvc.perform(delete("/level/{characterId}/{classId}", character.getId(), dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isForbidden());

        assertTrue(levelRepository.findById(new LevelKey(character.getId(), dndClass.getId())).isPresent());
    }

    @Test
    void deleteLevel_missingCharacter_returns404() throws Exception {
        UserEntity user = savedUser("level-delete-notfound-user");
        DndClassEntity dndClass = barbarian();

        mockMvc.perform(delete("/level/{characterId}/{classId}", 999_999L, dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isNotFound());
    }

    // ─── POST /levels ───────────────────────────────────────────────────────────

    @Test
    void createLevel_owner_returns201AndPersists() throws Exception {
        UserEntity owner = savedUser("level-create-owner");
        CharacterEntity character = characterOwnedBy(owner, "create-owner-character");
        DndClassEntity dndClass = barbarian();

        mockMvc.perform(post("/levels")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "character": {"id": %d}, "dndClass": {"id": %d}, "level": 2 }
                                """.formatted(character.getId(), dndClass.getId())))
                .andExpect(status().isCreated());

        assertTrue(levelRepository.findById(new LevelKey(character.getId(), dndClass.getId())).isPresent());
    }

    @Test
    void createLevel_nonOwnerNonDm_returns403AndCreatesNothing() throws Exception {
        UserEntity owner = savedUser("level-create-real-owner");
        UserEntity other = savedUser("level-create-other-user");
        CharacterEntity character = characterOwnedBy(owner, "create-forbidden-character");
        DndClassEntity dndClass = barbarian();

        mockMvc.perform(post("/levels")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "character": {"id": %d}, "dndClass": {"id": %d}, "level": 2 }
                                """.formatted(character.getId(), dndClass.getId())))
                .andExpect(status().isForbidden());

        assertFalse(levelRepository.findById(new LevelKey(character.getId(), dndClass.getId())).isPresent());
    }

    @Test
    void createLevel_missingCharacterId_returns400() throws Exception {
        UserEntity user = savedUser("level-create-nochar-user");
        DndClassEntity dndClass = barbarian();

        mockMvc.perform(post("/levels")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "dndClass": {"id": %d}, "level": 2 }
                                """.formatted(dndClass.getId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createLevel_missingCharacter_returns404() throws Exception {
        UserEntity user = savedUser("level-create-missingchar-user");
        DndClassEntity dndClass = barbarian();

        mockMvc.perform(post("/levels")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "character": {"id": 999999}, "dndClass": {"id": %d}, "level": 2 }
                                """.formatted(dndClass.getId())))
                .andExpect(status().isNotFound());
    }
}
