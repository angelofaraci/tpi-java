package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AdminUserEndpointTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;

    // ── GET /admin/users ───────────────────────────────────────────────────────

    @Test
    void adminCanListAllUsers() throws Exception {
        UserEntity admin = savedAdmin("admin-list-users");

        mockMvc.perform(get("/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void nonAdminCannotListUsers() throws Exception {
        UserEntity regularUser = savedUser("regular-list-users");

        mockMvc.perform(get("/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(regularUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedCannotListUsers() throws Exception {
        mockMvc.perform(get("/admin/users"))
                .andExpect(status().isForbidden());
    }

    // ── PATCH /admin/users/{id} ────────────────────────────────────────────────

    @Test
    void adminCanUpdateUsernameAndEmail() throws Exception {
        UserEntity admin   = savedAdmin("admin-patch-user");
        UserEntity target  = savedUser("target-patch-user");

        mockMvc.perform(patch("/admin/users/" + target.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "updated-username", "email": "updated@example.com" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("updated-username"))
                .andExpect(jsonPath("$.email").value("updated@example.com"));

        UserEntity persisted = userRepository.findById(target.getId()).orElseThrow();
        assertEquals("updated-username", persisted.getUsername());
        assertEquals("updated@example.com", persisted.getEmail());
    }

    @Test
    void adminCanUpdatePassword() throws Exception {
        UserEntity admin  = savedAdmin("admin-patch-pwd");
        UserEntity target = savedUser("target-patch-pwd");

        String oldHash = target.getPassword();

        mockMvc.perform(patch("/admin/users/" + target.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "password": "newSecurePass123" }
                                """))
                .andExpect(status().isOk());

        UserEntity persisted = userRepository.findById(target.getId()).orElseThrow();
        assertNotEquals(oldHash, persisted.getPassword(), "Password hash must change after admin update");
        // The stored hash must now match the new plain-text value
        assert passwordEncoder.matches("newSecurePass123", persisted.getPassword());
    }

    @Test
    void adminPatchOnNonExistentUserReturns404() throws Exception {
        UserEntity admin = savedAdmin("admin-patch-404");

        mockMvc.perform(patch("/admin/users/999999")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "ghost" }
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void nonAdminCannotUpdateUser() throws Exception {
        UserEntity regularUser = savedUser("regular-patch-user");
        UserEntity target      = savedUser("target-regular-patch");

        mockMvc.perform(patch("/admin/users/" + target.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(regularUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "hacked" }
                                """))
                .andExpect(status().isForbidden());
    }

    // ── DELETE /admin/users/{id} ───────────────────────────────────────────────

    @Test
    void adminCanDeleteUser() throws Exception {
        UserEntity admin  = savedAdmin("admin-delete-user");
        UserEntity target = savedUser("target-delete-user");
        Long targetId = target.getId();

        mockMvc.perform(delete("/admin/users/" + targetId)
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin)))
                .andExpect(status().isNoContent());

        assertFalse(userRepository.existsById(targetId), "User must be removed from the database");
    }

    @Test
    void adminDeleteOnNonExistentUserReturns404() throws Exception {
        UserEntity admin = savedAdmin("admin-delete-404");

        mockMvc.perform(delete("/admin/users/999998")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin)))
                .andExpect(status().isNotFound());
    }

    @Test
    void nonAdminCannotDeleteUser() throws Exception {
        UserEntity regularUser = savedUser("regular-delete-user");
        UserEntity target      = savedUser("target-nodelete");

        mockMvc.perform(delete("/admin/users/" + target.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(regularUser)))
                .andExpect(status().isForbidden());
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private UserEntity savedAdmin(String usernamePrefix) {
        return userRepository.save(UserEntity.builder()
                .username(usernamePrefix + "-" + System.nanoTime())
                .email(usernamePrefix + "@admin.com")
                .password(passwordEncoder.encode("adminpass"))
                .role(Role.ROLE_ADMIN)
                .build());
    }

    private UserEntity savedUser(String usernamePrefix) {
        return userRepository.save(UserEntity.builder()
                .username(usernamePrefix + "-" + System.nanoTime())
                .email(usernamePrefix + "@user.com")
                .password(passwordEncoder.encode("userpass"))
                .role(Role.ROLE_USER)
                .build());
    }

    private String bearerTokenFor(UserEntity user) {
        return "Bearer " + jwtService.getToken(user);
    }
}
