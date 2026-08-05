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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DndClassAuthorizationEndpointTests {

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

    // ─── helpers ───────────────────────────────────────────────────────────────

    private UserEntity savedUser(String prefix) {
        return userRepository.save(UserEntity.builder()
                .username(prefix + "-" + System.nanoTime())
                .email(prefix + "@user.com")
                .password(passwordEncoder.encode("userpass"))
                .role(Role.ROLE_USER)
                .build());
    }

    private UserEntity savedAdmin(String prefix) {
        return userRepository.save(UserEntity.builder()
                .username(prefix + "-" + System.nanoTime())
                .email(prefix + "@admin.com")
                .password(passwordEncoder.encode("adminpass"))
                .role(Role.ROLE_ADMIN)
                .build());
    }

    private String bearerTokenFor(UserEntity user) {
        return "Bearer " + jwtService.getToken(user);
    }

    // Deliberately a freshly created class, not the shared seeded "Barbarian" — this class's
    // fixtures mutate savingThrows, and the seeded classes are shared, session-wide state also
    // asserted on by DndClassEndpointTests (e.g. its exact Strength/Constitution expectation for
    // Barbarian); mutating a seeded class here would make that other test flaky depending on
    // run order.
    private DndClassEntity freshDndClass(String prefix) {
        return dndClassRepository.save(DndClassEntity.builder()
                .name(prefix + "-" + System.nanoTime())
                .hitDice(8)
                .build());
    }

    // ─── PATCH /dnd-class/{id} ─────────────────────────────────────────────────

    @Test
    void patchDndClass_admin_returns200() throws Exception {
        UserEntity admin = savedAdmin("dnd-class-auth-patch-admin");
        DndClassEntity dndClass = freshDndClass("PatchableClass");

        mockMvc.perform(patch("/dnd-class/" + dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "savingThrows": ["Wisdom", "Charisma"] }
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void patchDndClass_nonAdmin_returns403() throws Exception {
        UserEntity user = savedUser("dnd-class-auth-patch-user");
        DndClassEntity dndClass = freshDndClass("UnpatchableClass");

        mockMvc.perform(patch("/dnd-class/" + dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "savingThrows": ["Wisdom", "Charisma"] }
                                """))
                .andExpect(status().isForbidden());
    }

    // ─── DELETE /dnd-class/{id} ────────────────────────────────────────────────

    @Test
    void deleteDndClass_admin_returns204() throws Exception {
        UserEntity admin = savedAdmin("dnd-class-auth-delete-admin");
        DndClassEntity dndClass = dndClassRepository.save(DndClassEntity.builder()
                .name("DeletableClass-" + System.nanoTime())
                .hitDice(6)
                .build());

        mockMvc.perform(delete("/dnd-class/" + dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin)))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteDndClass_nonAdmin_returns403() throws Exception {
        UserEntity user = savedUser("dnd-class-auth-delete-user");
        DndClassEntity dndClass = dndClassRepository.save(DndClassEntity.builder()
                .name("UndeletableClass-" + System.nanoTime())
                .hitDice(6)
                .build());

        mockMvc.perform(delete("/dnd-class/" + dndClass.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user)))
                .andExpect(status().isForbidden());
    }
}
