package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import com.utn.javaproject.dndsheets.services.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CharacterDeleteEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private JwtService jwtService;

    // ─── helpers ───────────────────────────────────────────────────────────────

    private UserEntity savedUser(String prefix) {
        return userRepository.save(UserEntity.builder()
                .username(prefix + "-name")
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

    private String bearer(UserEntity user) {
        return "Bearer " + jwtService.getToken(user);
    }

    // ─── tests ─────────────────────────────────────────────────────────────────

    @Test
    void deleteCharacter_authenticatedOwner_returns204AndRemovesCharacter() throws Exception {
        UserEntity owner = savedUser("delete-owner");
        CharacterEntity character = characterOwnedBy(owner, "delete-success-character");

        mockMvc.perform(delete("/character/{id}", character.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isNoContent());

        assertFalse(characterRepository.existsById(character.getId()));
    }

    @Test
    void deleteCharacter_authenticatedNonOwner_returns403AndKeepsCharacter() throws Exception {
        UserEntity owner = savedUser("delete-real-owner");
        UserEntity other = savedUser("delete-other-user");
        CharacterEntity character = characterOwnedBy(owner, "delete-forbidden-character");

        mockMvc.perform(delete("/character/{id}", character.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isForbidden());

        assertTrue(characterRepository.existsById(character.getId()));
    }

    @Test
    void deleteCharacter_nonExistentCharacter_returns404NotFound() throws Exception {
        UserEntity user = savedUser("delete-notfound-user");

        mockMvc.perform(delete("/character/{id}", 999_999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isNotFound());
    }
}
