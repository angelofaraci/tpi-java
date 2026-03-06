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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignCreateEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private JwtService jwtService;

    @Test
    void authenticatedRequestPersistsCampaignForAuthenticatedUserInsteadOfBodyDm() throws Exception {
        UserEntity authenticatedUser = userRepository.save(UserEntity.builder()
                .username("campaign-owner")
                .email("campaign-owner@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());

        UserEntity bodyDm = userRepository.save(UserEntity.builder()
                .username("body-dm")
                .email("body-dm@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());

        String campaignName = "JWT-owned campaign";

        mockMvc.perform(post("/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(authenticatedUser))
                        .content("""
                                {
                                  "name": "%s",
                                  "description": "Campaign should belong to JWT user",
                                  "privacy": false,
                                  "dm": {
                                    "id": %d
                                  }
                                }
                                """.formatted(campaignName, bodyDm.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value(campaignName));

        CampaignEntity persistedCampaign = persistedCampaignNamed(campaignName);
        assertNotNull(persistedCampaign.getDm(), "Campaign must be owned by the authenticated user");
        assertEquals(authenticatedUser.getId(), persistedCampaign.getDm().getId());
        assertNotEquals(bodyDm.getId(), persistedCampaign.getDm().getId());
    }

    @Test
    void authenticatedRequestWithoutDmStillPersistsAuthenticatedOwner() throws Exception {
        UserEntity authenticatedUser = userRepository.save(UserEntity.builder()
                .username("campaign-owner-without-dm")
                .email("campaign-owner-without-dm@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());

        String campaignName = "JWT-owned campaign without dm";

        mockMvc.perform(post("/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(authenticatedUser))
                        .content("""
                                {
                                  "name": "%s",
                                  "description": "Campaign creation should derive ownership from auth",
                                  "privacy": true
                                }
                                """.formatted(campaignName)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value(campaignName));

        CampaignEntity persistedCampaign = persistedCampaignNamed(campaignName);
        assertNotNull(persistedCampaign.getDm(), "Campaign must be owned by the authenticated user");
        assertEquals(authenticatedUser.getId(), persistedCampaign.getDm().getId());
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(post("/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "unauthenticated campaign",
                                  "description": "Should never be created",
                                  "privacy": false
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    private CampaignEntity persistedCampaignNamed(String name) {
        return campaignRepository.findAll().stream()
                .filter(campaign -> name.equals(campaign.getName()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Campaign '%s' was not persisted".formatted(name)));
    }

    private String bearerTokenFor(UserEntity user) {
        return "Bearer " + jwtService.getToken(user);
    }
}
