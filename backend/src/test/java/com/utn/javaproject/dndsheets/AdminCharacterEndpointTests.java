package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import com.utn.javaproject.dndsheets.services.CharacterService;
import com.utn.javaproject.dndsheets.services.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AdminCharacterEndpointTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private CharacterRepository characterRepository;
    @Autowired private CharacterService characterService;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;

    // ── GET /admin/characters ──────────────────────────────────────────────────

    @Test
    void adminCanListAllCharacters() throws Exception {
        UserEntity admin = savedAdmin("admin-list-chars");

        mockMvc.perform(get("/admin/characters")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void nonAdminCannotListCharactersViaAdminEndpoint() throws Exception {
        UserEntity user = savedUser("regular-list-chars");

        mockMvc.perform(get("/admin/characters")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user)))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedCannotListCharactersViaAdminEndpoint() throws Exception {
        mockMvc.perform(get("/admin/characters"))
                .andExpect(status().isForbidden());
    }

    // ── PATCH /admin/characters/{id} ───────────────────────────────────────────

    @Test
    void adminCanUpdateCharacterName() throws Exception {
        UserEntity admin = savedAdmin("admin-patch-char");
        CharacterEntity character = savedCharacter("Original Name");

        mockMvc.perform(patch("/admin/characters/" + character.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Updated Name" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"));
    }

    @Test
    void adminCanUpdateCharacterAlignmentAndBackground() throws Exception {
        UserEntity admin = savedAdmin("admin-patch-char-align");
        CharacterEntity character = savedCharacter("Hero");

        mockMvc.perform(patch("/admin/characters/" + character.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "alignment": "Lawful Good", "background": "Soldier" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alignment").value("Lawful Good"))
                .andExpect(jsonPath("$.background").value("Soldier"));
    }

    @Test
    void adminPatchWithInvalidAlignmentReturns400() throws Exception {
        UserEntity admin = savedAdmin("admin-patch-char-invalid");
        CharacterEntity character = savedCharacter("BadAlign");

        mockMvc.perform(patch("/admin/characters/" + character.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "alignment": "Chaotic Hungry" }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminPatchOnNonExistentCharacterReturns404() throws Exception {
        UserEntity admin = savedAdmin("admin-patch-char-404");

        mockMvc.perform(patch("/admin/characters/999999")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Ghost" }
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void nonAdminCannotUpdateCharacterViaAdminEndpoint() throws Exception {
        UserEntity user = savedUser("regular-patch-char");
        CharacterEntity character = savedCharacter("Protected");

        mockMvc.perform(patch("/admin/characters/" + character.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Hacked" }
                                """))
                .andExpect(status().isForbidden());
    }

    // ── DELETE /admin/characters/{id} ──────────────────────────────────────────

    @Test
    void adminCanDeleteCharacter() throws Exception {
        UserEntity admin = savedAdmin("admin-delete-char");
        CharacterEntity character = savedCharacter("To Be Deleted");
        Long characterId = character.getId();

        mockMvc.perform(delete("/admin/characters/" + characterId)
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin)))
                .andExpect(status().isNoContent());

        assertFalse(characterRepository.existsById(characterId), "Character must be removed from the database");
    }

    @Test
    void adminDeleteOnNonExistentCharacterReturns404() throws Exception {
        UserEntity admin = savedAdmin("admin-delete-char-404");

        mockMvc.perform(delete("/admin/characters/999997")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin)))
                .andExpect(status().isNotFound());
    }

    @Test
    void nonAdminCannotDeleteCharacterViaAdminEndpoint() throws Exception {
        UserEntity user = savedUser("regular-delete-char");
        CharacterEntity character = savedCharacter("Protected Char");

        mockMvc.perform(delete("/admin/characters/" + character.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user)))
                .andExpect(status().isForbidden());
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private CharacterEntity savedCharacter(String name) {
        CharacterEntity character = CharacterEntity.builder()
                .name(name)
                .characterStats(CharacterStatsEntity.builder()
                        .xp(0L)
                        .proficiency((short) 2)
                        .abilityScores(new HashMap<>())
                        .velocities(List.of(30L))
                        .proficiencies(new HashMap<>())
                        .hp(10)
                        .build())
                .build();
        return characterService.save(character);
    }

    private UserEntity savedAdmin(String prefix) {
        return userRepository.save(UserEntity.builder()
                .username(prefix + "-" + System.nanoTime())
                .email(prefix + "@admin.com")
                .password(passwordEncoder.encode("adminpass"))
                .role(Role.ROLE_ADMIN)
                .build());
    }

    private UserEntity savedUser(String prefix) {
        return userRepository.save(UserEntity.builder()
                .username(prefix + "-" + System.nanoTime())
                .email(prefix + "@user.com")
                .password(passwordEncoder.encode("userpass"))
                .role(Role.ROLE_USER)
                .build());
    }

    private String bearerTokenFor(UserEntity user) {
        return "Bearer " + jwtService.getToken(user);
    }
}
