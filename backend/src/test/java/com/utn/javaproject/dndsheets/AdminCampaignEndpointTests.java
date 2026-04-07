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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AdminCampaignEndpointTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private CampaignRepository campaignRepository;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;

    // ── GET /admin/campaigns ───────────────────────────────────────────────────

    @Test
    void adminCanListAllCampaignsIncludingPrivate() throws Exception {
        UserEntity admin = savedAdmin("admin-list-campaigns");
        long nano = System.nanoTime();
        // Crea una campaña pública y una privada con nombres únicos
        campaignRepository.save(CampaignEntity.builder()
                .name("Public-" + nano)
                .description("Public campaign")
                .privacy(false)
                .dm(admin)
                .build());
        campaignRepository.save(CampaignEntity.builder()
                .name("Secret-" + nano)
                .description("Private campaign")
                .privacy(true)
                .dm(admin)
                .build());

        mockMvc.perform(get("/admin/campaigns")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                // The private campaign must appear in the admin listing
                .andExpect(jsonPath("$[?(@.name == 'Secret-" + nano + "' && @.privacy == true)]").exists())
                // The public campaign must also be present
                .andExpect(jsonPath("$[?(@.name == 'Public-" + nano + "' && @.privacy == false)]").exists());
    }

    @Test
    void nonAdminCannotListCampaignsViaAdminEndpoint() throws Exception {
        UserEntity user = savedUser("regular-list-campaigns");

        mockMvc.perform(get("/admin/campaigns")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user)))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedCannotListCampaignsViaAdminEndpoint() throws Exception {
        mockMvc.perform(get("/admin/campaigns"))
                .andExpect(status().isForbidden());
    }

    // ── PATCH /admin/campaigns/{id} ────────────────────────────────────────────

    @Test
    void adminCanUpdateCampaignName() throws Exception {
        UserEntity admin = savedAdmin("admin-patch-campaign");
        CampaignEntity campaign = savedCampaign("Original Campaign", admin, false);

        mockMvc.perform(patch("/admin/campaigns/" + campaign.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Renamed Campaign" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed Campaign"));
    }

    @Test
    void adminCanUpdateCampaignPrivacy() throws Exception {
        UserEntity admin = savedAdmin("admin-patch-campaign-privacy");
        CampaignEntity campaign = savedCampaign("Public Campaign", admin, false);

        mockMvc.perform(patch("/admin/campaigns/" + campaign.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "privacy": true }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.privacy").value(true));
    }

    @Test
    void adminPatchOnNonExistentCampaignReturns404() throws Exception {
        UserEntity admin = savedAdmin("admin-patch-campaign-404");

        mockMvc.perform(patch("/admin/campaigns/999999")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Ghost Campaign" }
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void nonAdminCannotUpdateCampaignViaAdminEndpoint() throws Exception {
        UserEntity admin = savedAdmin("admin-patch-owner");
        UserEntity user  = savedUser("regular-patch-campaign");
        CampaignEntity campaign = savedCampaign("Protected Campaign", admin, false);

        mockMvc.perform(patch("/admin/campaigns/" + campaign.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Hacked" }
                                """))
                .andExpect(status().isForbidden());
    }

    // ── DELETE /admin/campaigns/{id} ───────────────────────────────────────────

    @Test
    void adminCanDeleteCampaign() throws Exception {
        UserEntity admin = savedAdmin("admin-delete-campaign");
        CampaignEntity campaign = savedCampaign("To Be Deleted Campaign", admin, false);
        Long campaignId = campaign.getId();

        mockMvc.perform(delete("/admin/campaigns/" + campaignId)
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin)))
                .andExpect(status().isNoContent());

        assertFalse(campaignRepository.existsById(campaignId), "Campaign must be removed from the database");
    }

    @Test
    void adminDeleteOnNonExistentCampaignReturns404() throws Exception {
        UserEntity admin = savedAdmin("admin-delete-campaign-404");

        mockMvc.perform(delete("/admin/campaigns/999996")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(admin)))
                .andExpect(status().isNotFound());
    }

    @Test
    void nonAdminCannotDeleteCampaignViaAdminEndpoint() throws Exception {
        UserEntity admin = savedAdmin("admin-delete-owner");
        UserEntity user  = savedUser("regular-delete-campaign");
        CampaignEntity campaign = savedCampaign("Protected Campaign Del", admin, false);

        mockMvc.perform(delete("/admin/campaigns/" + campaign.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user)))
                .andExpect(status().isForbidden());
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private CampaignEntity savedCampaign(String name, UserEntity dm, boolean privacy) {
        return campaignRepository.save(CampaignEntity.builder()
                .name(name)
                .description("Test campaign")
                .privacy(privacy)
                .dm(dm)
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
