package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import com.utn.javaproject.dndsheets.services.FileStorageService;
import com.utn.javaproject.dndsheets.services.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CharacterPortraitEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private FileStorageService fileStorageService;

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
    void uploadPortrait_validImage_authenticatedOwner_returns200WithPortraitUrl() throws Exception {
        UserEntity owner = savedUser("portrait-success-owner");
        CharacterEntity character = characterOwnedBy(owner, "portrait-success-character");

        when(fileStorageService.store(any())).thenReturn("/uploads/portraits/test-uuid.jpg");

        MockMultipartFile file = new MockMultipartFile(
                "file", "portrait.jpg", "image/jpeg", "fake-image-bytes".getBytes());

        mockMvc.perform(multipart("/characters/{id}/portrait", character.getId())
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.portraitUrl").value("/uploads/portraits/test-uuid.jpg"));
    }

    @Test
    void uploadPortrait_textPlainFile_returns415UnsupportedMediaType() throws Exception {
        UserEntity owner = savedUser("portrait-mime-owner");
        CharacterEntity character = characterOwnedBy(owner, "portrait-mime-character");

        MockMultipartFile file = new MockMultipartFile(
                "file", "notes.txt", "text/plain", "not an image".getBytes());

        mockMvc.perform(multipart("/characters/{id}/portrait", character.getId())
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void uploadPortrait_authenticatedNonOwner_returns403Forbidden() throws Exception {
        UserEntity owner = savedUser("portrait-real-owner");
        UserEntity other = savedUser("portrait-other-user");
        CharacterEntity character = characterOwnedBy(owner, "portrait-forbidden-character");

        MockMultipartFile file = new MockMultipartFile(
                "file", "portrait.jpg", "image/jpeg", "fake-image-bytes".getBytes());

        mockMvc.perform(multipart("/characters/{id}/portrait", character.getId())
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isForbidden());
    }

    @Test
    void uploadPortrait_nonExistentCharacter_returns404NotFound() throws Exception {
        UserEntity user = savedUser("portrait-notfound-user");

        MockMultipartFile file = new MockMultipartFile(
                "file", "portrait.jpg", "image/jpeg", "fake-image-bytes".getBytes());

        mockMvc.perform(multipart("/characters/{id}/portrait", 999_999L)
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isNotFound());
    }
}
