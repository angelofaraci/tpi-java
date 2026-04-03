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

import static org.hamcrest.Matchers.aMapWithSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignMineEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private JwtService jwtService;

    @Test
    void authenticatedDmReceivesOwnedCampaigns() throws Exception {
        UserEntity dm = userRepository.save(UserEntity.builder()
                .username("mine-dm")
                .email("mine-dm@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());

        UserEntity player = userRepository.save(UserEntity.builder()
                .username("mine-player")
                .email("mine-player@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());

        UserEntity otherDm = userRepository.save(UserEntity.builder()
                .username("other-dm")
                .email("other-dm@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());

        campaignRepository.save(CampaignEntity.builder()
                .dm(otherDm)
                .name("Other DM Campaign")
                .description("Should not be returned")
                .privacy(false)
                .creationDate(new Date(1_000L))
                .players(List.of())
                .characters(List.of())
                .build());

        campaignRepository.save(CampaignEntity.builder()
                .dm(dm)
                .name("Old Watchtower")
                .description("First owned campaign")
                .privacy(false)
                .creationDate(new Date(2_000L))
                .players(List.of())
                .characters(List.of())
                .build());

        campaignRepository.save(CampaignEntity.builder()
                .dm(dm)
                .name("Hidden Shrine")
                .description("Second owned campaign")
                .privacy(true)
                .creationDate(new Date(3_000L))
                .players(List.of(player))
                .characters(List.of())
                .build());

        mockMvc.perform(get("/campaigns/mine")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(dm)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Hidden Shrine"))
                .andExpect(jsonPath("$[0].description").value("Second owned campaign"))
                .andExpect(jsonPath("$[0].privacy").value(true))
                .andExpect(jsonPath("$[0].dm").doesNotExist())
                .andExpect(jsonPath("$[1].name").value("Old Watchtower"));
    }

    @Test
    void authenticatedUserWithNoOwnedCampaignsGetsEmptyList() throws Exception {
        UserEntity user = userRepository.save(UserEntity.builder()
                .username("no-campaigns-user")
                .email("no-campaigns@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());

        mockMvc.perform(get("/campaigns/mine")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void createdCampaignAppearsInOwnedCampaignSummariesWithHomeCardFieldsOnly() throws Exception {
        UserEntity user = userRepository.save(UserEntity.builder()
                .username("mine-create-read-user")
                .email("mine-create-read-user@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());

        String campaignName = "Create Then Read Campaign";

        mockMvc.perform(post("/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user))
                        .content("""
                                {
                                  "name": "%s",
                                  "description": "Created campaign should show on home",
                                  "privacy": true,
                                  "creationDate": 4000
                                }
                                """.formatted(campaignName)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(campaignName));

        CampaignEntity createdCampaign = campaignRepository.findAll().stream()
                .filter(campaign -> campaignName.equals(campaign.getName()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Campaign '%s' was not persisted".formatted(campaignName)));

        mockMvc.perform(get("/campaigns/mine")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0]", aMapWithSize(6)))
                .andExpect(jsonPath("$[0].id").value(createdCampaign.getId()))
                .andExpect(jsonPath("$[0].name").value(campaignName))
                .andExpect(jsonPath("$[0].description").value("Created campaign should show on home"))
                .andExpect(jsonPath("$[0].privacy").value(true))
                .andExpect(jsonPath("$[0].creationDate").exists())
                .andExpect(jsonPath("$[0].dm").doesNotExist())
                .andExpect(jsonPath("$[0].players").doesNotExist())
                .andExpect(jsonPath("$[0].characters").doesNotExist())
                .andExpect(jsonPath("$[0].playerCount").doesNotExist());
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/campaigns/mine"))
                .andExpect(status().isForbidden());
    }

    private String bearerTokenFor(UserEntity user) {
        return "Bearer " + jwtService.getToken(user);
    }
}
