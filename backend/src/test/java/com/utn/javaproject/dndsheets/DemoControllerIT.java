package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.RaceEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.RaceRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Anonymous-access integration tests for the public {@code /demo/**} GET
 * endpoints. Also asserts the pre-existing protected perimeter (e.g.
 * {@code /characters}, {@code /campaigns}) is unaffected — this is the
 * regression guard against accidentally widening the security matchers.
 */
@SpringBootTest
@AutoConfigureMockMvc
class DemoControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private RaceRepository raceRepository;

    private UserEntity demoOwner() {
        return userRepository.save(UserEntity.builder()
                .username("it-demo-owner-" + System.nanoTime())
                .email("it-demo-owner-" + System.nanoTime() + "@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());
    }

    private UserEntity realOwner() {
        return userRepository.save(UserEntity.builder()
                .username("it-real-owner-" + System.nanoTime())
                .email("it-real-owner-" + System.nanoTime() + "@example.com")
                .password("secret")
                .role(Role.ROLE_USER)
                .build());
    }

    private RaceEntity race() {
        return raceRepository.save(RaceEntity.builder()
                .name("IT-Elf-" + System.nanoTime())
                .description("desc")
                .racialFeats(List.of("Darkvision"))
                .build());
    }

    private CampaignEntity demoCampaign(UserEntity owner) {
        CampaignEntity campaign = new CampaignEntity();
        campaign.setDm(owner);
        campaign.setName("IT Demo Campaign " + System.nanoTime());
        campaign.setDescription("desc");
        campaign.setPrivacy(true);
        campaign.setIsDemo(true);
        campaign.setCreationDate(new Date());
        campaign.setPlayers(List.of());
        return campaignRepository.save(campaign);
    }

    private CampaignEntity realCampaign(UserEntity owner) {
        CampaignEntity campaign = new CampaignEntity();
        campaign.setDm(owner);
        campaign.setName("IT Real Campaign " + System.nanoTime());
        campaign.setDescription("desc");
        campaign.setPrivacy(true);
        campaign.setIsDemo(false);
        campaign.setCreationDate(new Date());
        campaign.setPlayers(List.of());
        return campaignRepository.save(campaign);
    }

    private CharacterEntity demoCharacter(UserEntity owner, CampaignEntity campaign, RaceEntity race) {
        CharacterEntity character = new CharacterEntity();
        character.setUser(owner);
        character.setCampaign(campaign);
        character.setName("IT Demo Character");
        character.setRace(race);
        character.setAlignment("Chaotic Good");
        character.setBackground("bg");
        character.setCharacteristics(List.of("Curious"));
        character.setIsDemo(true);
        return characterRepository.save(character);
    }

    private CharacterEntity realCharacter(UserEntity owner, CampaignEntity campaign, RaceEntity race) {
        CharacterEntity character = new CharacterEntity();
        character.setUser(owner);
        character.setCampaign(campaign);
        character.setName("IT Real Character");
        character.setRace(race);
        character.setAlignment("Lawful Neutral");
        character.setIsDemo(false);
        return characterRepository.save(character);
    }

    @Test
    void getDemoCampaigns_anonymous_returns200() throws Exception {
        UserEntity owner = demoOwner();
        demoCampaign(owner);

        mockMvc.perform(get("/demo/campaigns"))
                .andExpect(status().isOk());
    }

    @Test
    void getDemoCharacters_anonymous_returns200() throws Exception {
        UserEntity owner = demoOwner();
        RaceEntity race = race();
        CampaignEntity campaign = demoCampaign(owner);
        demoCharacter(owner, campaign, race);

        mockMvc.perform(get("/demo/characters"))
                .andExpect(status().isOk());
    }

    @Test
    void getDemoCharacterById_anonymous_demoCharacter_returns200WithFullSheetData() throws Exception {
        UserEntity owner = demoOwner();
        RaceEntity race = race();
        CampaignEntity campaign = demoCampaign(owner);
        CharacterEntity character = demoCharacter(owner, campaign, race);

        mockMvc.perform(get("/demo/characters/{id}", character.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(character.getId()))
                .andExpect(jsonPath("$.name").value("IT Demo Character"))
                .andExpect(jsonPath("$.raceName").value(race.getName()))
                .andExpect(jsonPath("$.background").value("bg"))
                .andExpect(jsonPath("$.alignment").value("Chaotic Good"))
                .andExpect(jsonPath("$.user").doesNotExist())
                .andExpect(jsonPath("$.dm").doesNotExist())
                .andExpect(jsonPath("$.joinCode").doesNotExist());
    }

    @Test
    void getDemoCharacterById_anonymous_realCharacter_returns404() throws Exception {
        UserEntity owner = realOwner();
        RaceEntity race = race();
        CampaignEntity campaign = realCampaign(owner);
        CharacterEntity character = realCharacter(owner, campaign, race);

        mockMvc.perform(get("/demo/characters/{id}", character.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void getDemoCharacterById_anonymous_nonExistentId_returns404() throws Exception {
        mockMvc.perform(get("/demo/characters/{id}", 999_999_999L))
                .andExpect(status().isNotFound());
    }

    @Test
    void postToDemoNamespace_isRejected() throws Exception {
        mockMvc.perform(post("/demo/campaigns")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(404, 405, 401, 403);
                });
    }

    @Test
    void getCharacters_anonymous_stillRejected() throws Exception {
        mockMvc.perform(get("/characters"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(401, 403);
                });
    }

    @Test
    void getCampaigns_anonymous_stillRejected() throws Exception {
        mockMvc.perform(get("/campaigns"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(401, 403);
                });
    }
}
