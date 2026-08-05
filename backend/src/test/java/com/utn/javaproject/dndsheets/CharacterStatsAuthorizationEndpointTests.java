package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterStatsRepository;
import com.utn.javaproject.dndsheets.repositories.DndClassRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import com.utn.javaproject.dndsheets.services.JwtService;
import com.utn.javaproject.dndsheets.services.LevelService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CharacterStatsAuthorizationEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private CharacterStatsRepository characterStatsRepository;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private DndClassRepository dndClassRepository;

    @Autowired
    private LevelService levelService;

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

    // Deliberately minimal — repository-seeded fixtures skip characterCreateRequestValidator
    // (only exercised on the HTTP request body path), and a small map avoids the H2 test
    // schema's varbinary(255) column limit for Java-serialized HashMap fields.
    private HashMap<String, Short> abilityScores() {
        HashMap<String, Short> scores = new HashMap<>();
        scores.put("Constitution", (short) 14);
        return scores;
    }

    private CharacterStatsEntity statsFor(CharacterEntity character) {
        return characterStatsRepository.save(CharacterStatsEntity.builder()
                .character(character)
                .xp(0L)
                .proficiency((short) 2)
                .abilityScores(abilityScores())
                .velocities(List.of())
                .proficiencies(new HashMap<>())
                .hp(null)
                .build());
    }

    private String bearer(UserEntity user) {
        return "Bearer " + jwtService.getToken(user);
    }

    // ─── PUT character-stats/{id} ──────────────────────────────────────────────

    @Test
    void putCharacterStats_owner_returns200AndPersists() throws Exception {
        UserEntity owner = savedUser("stats-put-owner");
        CharacterEntity character = characterOwnedBy(owner, "put-owner-character");
        CharacterStatsEntity stats = statsFor(character);

        mockMvc.perform(put("/character-stats/{id}", stats.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "xp": 100, "proficiency": 2, "abilityScores": {"Constitution":14}, "velocities": [], "proficiencies": {} }
                                """))
                .andExpect(status().isOk());

        Optional<CharacterStatsEntity> reloaded = characterStatsRepository.findById(stats.getId());
        assertTrue(reloaded.isPresent());
        assertEquals(100L, reloaded.get().getXp());
    }

    @Test
    void putCharacterStats_nonOwnerNonDm_returns403AndLeavesUnchanged() throws Exception {
        UserEntity owner = savedUser("stats-put-real-owner");
        UserEntity other = savedUser("stats-put-other-user");
        CharacterEntity character = characterOwnedBy(owner, "put-forbidden-character");
        CharacterStatsEntity stats = statsFor(character);

        mockMvc.perform(put("/character-stats/{id}", stats.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "xp": 999, "proficiency": 2, "abilityScores": {"Constitution":14}, "velocities": [], "proficiencies": {} }
                                """))
                .andExpect(status().isForbidden());

        Optional<CharacterStatsEntity> reloaded = characterStatsRepository.findById(stats.getId());
        assertTrue(reloaded.isPresent());
        assertEquals(0L, reloaded.get().getXp());
    }

    @Test
    void putCharacterStats_missing_returns404() throws Exception {
        UserEntity user = savedUser("stats-put-notfound-user");

        mockMvc.perform(put("/character-stats/{id}", 999_999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "xp": 1 }
                                """))
                .andExpect(status().isNotFound());
    }

    // ─── PATCH character-stats/{id} ────────────────────────────────────────────

    @Test
    void patchCharacterStats_owner_returns200AndPersists() throws Exception {
        UserEntity owner = savedUser("stats-patch-owner");
        CharacterEntity character = characterOwnedBy(owner, "patch-owner-character");
        CharacterStatsEntity stats = statsFor(character);

        mockMvc.perform(patch("/character-stats/{id}", stats.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "xp": 50 }
                                """))
                .andExpect(status().isOk());

        Optional<CharacterStatsEntity> reloaded = characterStatsRepository.findById(stats.getId());
        assertTrue(reloaded.isPresent());
        assertEquals(50L, reloaded.get().getXp());
    }

    @Test
    void patchCharacterStats_campaignDm_returns200() throws Exception {
        UserEntity dm = savedUser("stats-patch-dm");
        UserEntity player = savedUser("stats-patch-player");
        CampaignEntity campaign = savedCampaign(dm, "stats-patch-campaign");
        CharacterEntity character = characterOwnedByInCampaign(player, campaign, "patch-dm-character");
        CharacterStatsEntity stats = statsFor(character);

        mockMvc.perform(patch("/character-stats/{id}", stats.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(dm))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "xp": 77 }
                                """))
                .andExpect(status().isOk());

        Optional<CharacterStatsEntity> reloaded = characterStatsRepository.findById(stats.getId());
        assertTrue(reloaded.isPresent());
        assertEquals(77L, reloaded.get().getXp());
    }

    @Test
    void patchCharacterStats_nonOwnerNonDm_returns403AndLeavesUnchanged() throws Exception {
        UserEntity owner = savedUser("stats-patch-real-owner");
        UserEntity other = savedUser("stats-patch-other-user");
        CharacterEntity character = characterOwnedBy(owner, "patch-forbidden-character");
        CharacterStatsEntity stats = statsFor(character);

        mockMvc.perform(patch("/character-stats/{id}", stats.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "xp": 999 }
                                """))
                .andExpect(status().isForbidden());

        Optional<CharacterStatsEntity> reloaded = characterStatsRepository.findById(stats.getId());
        assertTrue(reloaded.isPresent());
        assertEquals(0L, reloaded.get().getXp());
    }

    @Test
    void patchCharacterStats_missing_returns404() throws Exception {
        UserEntity user = savedUser("stats-patch-notfound-user");

        mockMvc.perform(patch("/character-stats/{id}", 999_999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "xp": 1 }
                                """))
                .andExpect(status().isNotFound());
    }

    // ─── DELETE character-stats/{id} ───────────────────────────────────────────

    @Test
    void deleteCharacterStats_owner_returns204AndRemoves() throws Exception {
        UserEntity owner = savedUser("stats-delete-owner");
        CharacterEntity character = characterOwnedBy(owner, "delete-owner-character");
        CharacterStatsEntity stats = statsFor(character);

        mockMvc.perform(delete("/character-stats/{id}", stats.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isNoContent());

        assertTrue(characterStatsRepository.findById(stats.getId()).isEmpty());
    }

    @Test
    void deleteCharacterStats_nonOwnerNonDm_returns403AndKeeps() throws Exception {
        UserEntity owner = savedUser("stats-delete-real-owner");
        UserEntity other = savedUser("stats-delete-other-user");
        CharacterEntity character = characterOwnedBy(owner, "delete-forbidden-character");
        CharacterStatsEntity stats = statsFor(character);

        mockMvc.perform(delete("/character-stats/{id}", stats.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isForbidden());

        assertTrue(characterStatsRepository.findById(stats.getId()).isPresent());
    }

    @Test
    void deleteCharacterStats_missing_returns404() throws Exception {
        UserEntity user = savedUser("stats-delete-notfound-user");

        mockMvc.perform(delete("/character-stats/{id}", 999_999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isNotFound());
    }

    // ─── PUT character-stats/{id}/{classId} (HP) ───────────────────────────────

    @Test
    void putHp_owner_returns200AndPersistsHp() throws Exception {
        UserEntity owner = savedUser("stats-hp-owner");
        CharacterEntity character = characterOwnedBy(owner, "hp-owner-character");
        CharacterStatsEntity stats = statsFor(character);
        DndClassEntity barbarian = dndClassRepository.findByName("Barbarian")
                .orElseThrow(() -> new AssertionError("Seeded class 'Barbarian' not found"));
        levelService.ensureLevel(character.getId(), barbarian.getId(), (short) 3);

        mockMvc.perform(put("/character-stats/{id}/{classId}", stats.getId(), barbarian.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk());

        Optional<CharacterStatsEntity> reloaded = characterStatsRepository.findById(stats.getId());
        assertTrue(reloaded.isPresent());
        assertTrue(reloaded.get().getHp() != null);
    }

    @Test
    void putHp_campaignDm_returns200() throws Exception {
        UserEntity dm = savedUser("stats-hp-dm");
        UserEntity player = savedUser("stats-hp-player");
        CampaignEntity campaign = savedCampaign(dm, "stats-hp-campaign");
        CharacterEntity character = characterOwnedByInCampaign(player, campaign, "hp-dm-character");
        CharacterStatsEntity stats = statsFor(character);
        DndClassEntity barbarian = dndClassRepository.findByName("Barbarian")
                .orElseThrow(() -> new AssertionError("Seeded class 'Barbarian' not found"));
        levelService.ensureLevel(character.getId(), barbarian.getId(), (short) 3);

        mockMvc.perform(put("/character-stats/{id}/{classId}", stats.getId(), barbarian.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(dm)))
                .andExpect(status().isOk());
    }

    @Test
    void putHp_nonOwnerNonDm_returns403AndLeavesUnchanged() throws Exception {
        UserEntity owner = savedUser("stats-hp-real-owner");
        UserEntity other = savedUser("stats-hp-other-user");
        CharacterEntity character = characterOwnedBy(owner, "hp-forbidden-character");
        CharacterStatsEntity stats = statsFor(character);
        DndClassEntity barbarian = dndClassRepository.findByName("Barbarian")
                .orElseThrow(() -> new AssertionError("Seeded class 'Barbarian' not found"));
        levelService.ensureLevel(character.getId(), barbarian.getId(), (short) 3);

        mockMvc.perform(put("/character-stats/{id}/{classId}", stats.getId(), barbarian.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isForbidden());

        Optional<CharacterStatsEntity> reloaded = characterStatsRepository.findById(stats.getId());
        assertTrue(reloaded.isPresent());
        assertNull(reloaded.get().getHp());
    }

    @Test
    void putHp_missingStats_returns404() throws Exception {
        UserEntity user = savedUser("stats-hp-notfound-user");
        DndClassEntity barbarian = dndClassRepository.findByName("Barbarian")
                .orElseThrow(() -> new AssertionError("Seeded class 'Barbarian' not found"));

        mockMvc.perform(put("/character-stats/{id}/{classId}", 999_999L, barbarian.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isNotFound());
    }
}
