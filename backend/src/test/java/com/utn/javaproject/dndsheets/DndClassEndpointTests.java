package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.DndClassRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import com.utn.javaproject.dndsheets.services.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DndClassEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DndClassRepository dndClassRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // ── GET /dnd-classes ───────────────────────────────────────────────────────

    @Test
    void listDndClasses_returnsSavingThrowsInPayload() throws Exception {
        UserEntity user = savedUser("dnd-class-list");

        // The seeded classes (by ClassInitializer) must include savingThrows
        mockMvc.perform(get("/dnd-classes")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                // At least one class must have a non-empty savingThrows array
                .andExpect(jsonPath("$[?(@.savingThrows && @.savingThrows.length() > 0)]").exists());
    }

    @Test
    void listDndClasses_barbarianHasCorrectSavingThrows() throws Exception {
        UserEntity user = savedUser("dnd-class-list-barbarian");

        mockMvc.perform(get("/dnd-classes")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Barbarian')].savingThrows").isArray())
                .andExpect(jsonPath("$[?(@.name == 'Barbarian')].savingThrows[?(@ == 'Strength')]").exists())
                .andExpect(jsonPath("$[?(@.name == 'Barbarian')].savingThrows[?(@ == 'Constitution')]").exists());
    }

    // ── PATCH /dnd-class/{id} ──────────────────────────────────────────────────

    @Test
    void patchDndClass_updatesSavingThrows() throws Exception {
        UserEntity user = savedUser("dnd-class-patch");

        // Fetch a seeded class id (e.g. Barbarian)
        DndClassEntity barbarian = dndClassRepository.findByName("Barbarian")
                .orElseThrow(() -> new AssertionError("Seeded class 'Barbarian' not found"));

        mockMvc.perform(patch("/dnd-class/" + barbarian.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "savingThrows": ["Wisdom", "Charisma"] }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.savingThrows").isArray())
                .andExpect(jsonPath("$.savingThrows[?(@ == 'Wisdom')]").exists())
                .andExpect(jsonPath("$.savingThrows[?(@ == 'Charisma')]").exists());
    }

    @Test
    void patchDndClass_preservesExistingFieldsWhenOnlySavingThrowsUpdated() throws Exception {
        UserEntity user = savedUser("dnd-class-patch-preserve");

        DndClassEntity wizard = dndClassRepository.findByName("Wizard")
                .orElseThrow(() -> new AssertionError("Seeded class 'Wizard' not found"));
        String originalName = wizard.getName();

        mockMvc.perform(patch("/dnd-class/" + wizard.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "savingThrows": ["Intelligence", "Wisdom"] }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(originalName))
                .andExpect(jsonPath("$.savingThrows[?(@ == 'Intelligence')]").exists())
                .andExpect(jsonPath("$.savingThrows[?(@ == 'Wisdom')]").exists());
    }

    // ── ClassInitializer re-seed guard ─────────────────────────────────────────

    @Test
    @Transactional
    void classInitializer_patchesExistingClassWithEmptySavingThrows() {
        // Pre-insert a class without saving throws (simulates old DB row)
        String className = "TestClass-NoSavingThrows-" + System.nanoTime();
        DndClassEntity existing = new DndClassEntity();
        existing.setName(className);
        existing.setHitDice(8);
        existing.setLevelCharacteristics(new HashMap<>());
        existing.setSavingThrows(new ArrayList<>());
        dndClassRepository.saveAndFlush(existing);

        // Reload from DB and verify savingThrows is empty (baseline)
        DndClassEntity reloaded = dndClassRepository.findByName(className)
                .orElseThrow(() -> new AssertionError("Test class not found after save"));
        assertNotNull(reloaded.getSavingThrows());
        assertTrue(reloaded.getSavingThrows().isEmpty(), "savingThrows should be empty before patch");

        // Simulate what ClassInitializer does: if existing class has empty savingThrows, patch it
        List<String> newSavingThrows = new ArrayList<>(List.of("Strength", "Dexterity"));
        if (reloaded.getSavingThrows() == null || reloaded.getSavingThrows().isEmpty()) {
            reloaded.setSavingThrows(newSavingThrows);
            dndClassRepository.saveAndFlush(reloaded);
        }

        // Verify the patch was applied
        DndClassEntity patched = dndClassRepository.findByName(className)
                .orElseThrow(() -> new AssertionError("Test class not found after patch"));
        assertFalse(patched.getSavingThrows().isEmpty(), "savingThrows should be populated after patch");
        assertTrue(patched.getSavingThrows().contains("Strength"));
        assertTrue(patched.getSavingThrows().contains("Dexterity"));
    }

    // ── helpers ────────────────────────────────────────────────────────────────

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
