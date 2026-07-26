package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import com.utn.javaproject.dndsheets.services.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Backend Count Contract (spec.md "Requirement: Backend Count Contract"):
 * playerCount/characterCount on the list endpoints MUST be computed via the same
 * reusable CampaignService union logic used by GET /campaign/{id}'s player list,
 * so the numbers reported on the home dashboard always agree with the campaign
 * detail view for the same campaign.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CampaignCountParityTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private CampaignRepository campaignRepository;
    @Autowired private CharacterRepository characterRepository;
    @Autowired private JwtService jwtService;

    @Test
    void mineEndpoint_countsDmOwnedCharacterWithoutJoinTableRow() throws Exception {
        UserEntity dm = savedUser("parity-dm-no-row");
        UserEntity explicitPlayerOne = savedUser("parity-explicit-one");
        UserEntity explicitPlayerTwo = savedUser("parity-explicit-two");

        CampaignEntity campaign = campaignRepository.save(CampaignEntity.builder()
                .dm(dm)
                .name("Parity Table")
                .description("DM owns a character but has no campaign_players row")
                .privacy(false)
                .players(List.of(explicitPlayerOne, explicitPlayerTwo))
                .build());

        characterRepository.save(CharacterEntity.builder()
                .name("DM's Own Hero")
                .user(dm)
                .campaign(campaign)
                .build());

        mockMvc.perform(get("/campaigns/mine")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(dm)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].playerCount").value(3))
                .andExpect(jsonPath("$[0].characterCount").value(1));
    }

    @Test
    void asPlayerEndpoint_populatesPlayerCountAndCharacterCount() throws Exception {
        UserEntity dm = savedUser("parity-as-player-dm");
        UserEntity player = savedUser("parity-as-player-player");

        CampaignEntity campaign = campaignRepository.save(CampaignEntity.builder()
                .dm(dm)
                .name("As Player Parity Table")
                .description("Player-visible counts must match the union logic")
                .privacy(false)
                .players(List.of(player))
                .build());

        characterRepository.save(CharacterEntity.builder()
                .name("Player's Hero")
                .user(player)
                .campaign(campaign)
                .build());
        characterRepository.save(CharacterEntity.builder()
                .name("DM's Hero")
                .user(dm)
                .campaign(campaign)
                .build());

        mockMvc.perform(get("/campaigns/as-player")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(player)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].playerCount").value(2))
                .andExpect(jsonPath("$[0].characterCount").value(2));
    }

    @Test
    void listEndpointPlayerCount_matchesDetailEndpointPlayersSize_forSameCampaign() throws Exception {
        UserEntity dm = savedUser("parity-detail-dm");
        UserEntity explicitPlayer = savedUser("parity-detail-player");

        CampaignEntity campaign = campaignRepository.save(CampaignEntity.builder()
                .dm(dm)
                .name("Detail Parity Table")
                .description("List playerCount must equal detail players.size()")
                .privacy(false)
                .players(List.of(explicitPlayer))
                .build());

        characterRepository.save(CharacterEntity.builder()
                .name("DM's Hero")
                .user(dm)
                .campaign(campaign)
                .build());

        mockMvc.perform(get("/campaign/" + campaign.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(dm)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.players.length()").value(2));

        mockMvc.perform(get("/campaigns/mine")
                        .header(HttpHeaders.AUTHORIZATION, bearerTokenFor(dm)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].playerCount").value(2));
    }

    private UserEntity savedUser(String prefix) {
        return userRepository.save(UserEntity.builder()
                .username(prefix + "-" + System.nanoTime())
                .email(prefix + "@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());
    }

    private String bearerTokenFor(UserEntity user) {
        return "Bearer " + jwtService.getToken(user);
    }
}
