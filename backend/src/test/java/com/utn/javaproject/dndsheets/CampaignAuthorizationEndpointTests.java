package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignAuthorizationEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CampaignRepository campaignRepository;

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

    private String bearer(UserEntity user) {
        return "Bearer " + jwtService.getToken(user);
    }

    private String updateBody(String name) {
        return """
                { "name": "%s", "description": "updated description", "privacy": false }
                """.formatted(name);
    }

    // ─── PUT campaign/{id} ─────────────────────────────────────────────────────

    @Test
    void putCampaign_dm_returns200AndPersists() throws Exception {
        UserEntity dm = savedUser("put-dm");
        CampaignEntity campaign = savedCampaign(dm, "Original Name");

        mockMvc.perform(put("/campaign/{id}", campaign.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(dm))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody("Updated By DM")))
                .andExpect(status().isOk());

        Optional<CampaignEntity> reloaded = campaignRepository.findById(campaign.getId());
        assertTrue(reloaded.isPresent());
        assertEquals("Updated By DM", reloaded.get().getName());
    }

    @Test
    void putCampaign_nonDm_returns403AndLeavesUnchanged() throws Exception {
        UserEntity dm = savedUser("put-real-dm");
        UserEntity other = savedUser("put-other-user");
        CampaignEntity campaign = savedCampaign(dm, "Untouched Name");

        mockMvc.perform(put("/campaign/{id}", campaign.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody("Hijacked Name")))
                .andExpect(status().isForbidden());

        Optional<CampaignEntity> reloaded = campaignRepository.findById(campaign.getId());
        assertTrue(reloaded.isPresent());
        assertEquals("Untouched Name", reloaded.get().getName());
    }

    @Test
    void putCampaign_missingCampaign_returns404() throws Exception {
        UserEntity user = savedUser("put-notfound-user");

        mockMvc.perform(put("/campaign/{id}", 999_999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody("Doesn't Matter")))
                .andExpect(status().isNotFound());
    }

    // ─── PATCH campaign/{id} ───────────────────────────────────────────────────

    @Test
    void patchCampaign_dm_returns200AndPersists() throws Exception {
        UserEntity dm = savedUser("patch-dm");
        CampaignEntity campaign = savedCampaign(dm, "Original Patch Name");

        mockMvc.perform(patch("/campaign/{id}", campaign.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(dm))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Patched By DM" }
                                """))
                .andExpect(status().isOk());

        Optional<CampaignEntity> reloaded = campaignRepository.findById(campaign.getId());
        assertTrue(reloaded.isPresent());
        assertEquals("Patched By DM", reloaded.get().getName());
    }

    @Test
    void patchCampaign_nonDm_returns403AndLeavesUnchanged() throws Exception {
        UserEntity dm = savedUser("patch-real-dm");
        UserEntity other = savedUser("patch-other-user");
        CampaignEntity campaign = savedCampaign(dm, "Patch Untouched Name");

        mockMvc.perform(patch("/campaign/{id}", campaign.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Hijacked Patch Name" }
                                """))
                .andExpect(status().isForbidden());

        Optional<CampaignEntity> reloaded = campaignRepository.findById(campaign.getId());
        assertTrue(reloaded.isPresent());
        assertEquals("Patch Untouched Name", reloaded.get().getName());
    }

    @Test
    void patchCampaign_missingCampaign_returns404() throws Exception {
        UserEntity user = savedUser("patch-notfound-user");

        mockMvc.perform(patch("/campaign/{id}", 999_999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Doesn't Matter" }
                                """))
                .andExpect(status().isNotFound());
    }

    // ─── DELETE campaign/{id} ──────────────────────────────────────────────────

    @Test
    void deleteCampaign_dm_returns2xxAndRemovesCampaign() throws Exception {
        UserEntity dm = savedUser("delete-dm");
        CampaignEntity campaign = savedCampaign(dm, "Delete Me");

        mockMvc.perform(delete("/campaign/{id}", campaign.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(dm)))
                .andExpect(status().isNoContent());

        assertTrue(campaignRepository.findById(campaign.getId()).isEmpty());
    }

    @Test
    void deleteCampaign_nonDm_returns403AndKeepsCampaign() throws Exception {
        UserEntity dm = savedUser("delete-real-dm");
        UserEntity other = savedUser("delete-other-user");
        CampaignEntity campaign = savedCampaign(dm, "Keep Me");

        mockMvc.perform(delete("/campaign/{id}", campaign.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isForbidden());

        assertTrue(campaignRepository.findById(campaign.getId()).isPresent());
    }

    @Test
    void deleteCampaign_missingCampaign_returns404() throws Exception {
        UserEntity user = savedUser("delete-notfound-user");

        mockMvc.perform(delete("/campaign/{id}", 999_999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isNotFound());
    }
}
