package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.dto.DemoCampaignDto;
import com.utn.javaproject.dndsheets.domain.dto.DemoCharacterDetailDto;
import com.utn.javaproject.dndsheets.domain.dto.DemoCharacterSummaryDto;
import com.utn.javaproject.dndsheets.domain.entities.*;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.LevelRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DemoServiceTest {

    @Mock
    private CampaignRepository campaignRepository;

    @Mock
    private CharacterRepository characterRepository;

    @Mock
    private LevelRepository levelRepository;

    private DemoService demoService() {
        return new DemoService(campaignRepository, characterRepository, levelRepository);
    }

    private UserEntity demoUser() {
        return UserEntity.builder().id(500L).username("demo").email("demo@example.com").password("secret").build();
    }

    private CampaignEntity demoCampaign(UserEntity dm) {
        CampaignEntity campaign = new CampaignEntity();
        campaign.setId(1L);
        campaign.setJoinCode("ABCD-1234");
        campaign.setDm(dm);
        campaign.setName("Demo Campaign");
        campaign.setDescription("A sample campaign");
        campaign.setPrivacy(true);
        campaign.setIsDemo(true);
        campaign.setPlayers(List.of());
        campaign.setCharacters(List.of());
        return campaign;
    }

    @Test
    void listCampaigns_mapsToDto_withoutJoinCodeOrDmOrPlayers() {
        UserEntity dm = demoUser();
        CampaignEntity campaign = demoCampaign(dm);
        when(campaignRepository.findByIsDemoTrue()).thenReturn(List.of(campaign));

        List<DemoCampaignDto> result = demoService().listCampaigns();

        assertThat(result).hasSize(1);
        DemoCampaignDto dto = result.get(0);
        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getName()).isEqualTo("Demo Campaign");
        assertThat(dto.getDescription()).isEqualTo("A sample campaign");
        // DemoCampaignDto has no joinCode/dm/players fields at all — reflection guard
        assertThat(fieldNames(DemoCampaignDto.class))
                .doesNotContain("joinCode", "dm", "players", "user");
    }

    @Test
    void listCharacters_mapsToSummaryDto_withoutUserField() {
        UserEntity owner = demoUser();
        RaceEntity race = RaceEntity.builder().id(2L).name("Elf").racialFeats(List.of("Darkvision")).build();
        CharacterEntity character = new CharacterEntity();
        character.setId(10L);
        character.setUser(owner);
        character.setName("Aria Windwhisper");
        character.setRace(race);
        character.setAlignment("Chaotic Good");
        character.setIsDemo(true);
        when(characterRepository.findAllDemo()).thenReturn(List.of(character));
        when(levelRepository.findByIdCharacterId(10L)).thenReturn(List.of());

        List<DemoCharacterSummaryDto> result = demoService().listCharacters();

        assertThat(result).hasSize(1);
        DemoCharacterSummaryDto dto = result.get(0);
        assertThat(dto.getId()).isEqualTo(10L);
        assertThat(dto.getName()).isEqualTo("Aria Windwhisper");
        assertThat(dto.getRaceName()).isEqualTo("Elf");
        assertThat(dto.getAlignment()).isEqualTo("Chaotic Good");
        assertThat(fieldNames(DemoCharacterSummaryDto.class)).doesNotContain("user");
    }

    @Test
    void findCharacterDetail_returnsFullSheetData_withoutUserField() {
        UserEntity owner = demoUser();
        RaceEntity race = RaceEntity.builder().id(2L).name("Elf").racialFeats(List.of("Darkvision")).build();
        CharacterEntity character = new CharacterEntity();
        character.setId(10L);
        character.setUser(owner);
        character.setName("Aria Windwhisper");
        character.setRace(race);
        character.setAlignment("Chaotic Good");
        character.setBackground("A wandering scout.");
        character.setCharacteristics(List.of("Curious"));
        character.setIsDemo(true);

        CharacterStatsEntity stats = new CharacterStatsEntity();
        stats.setProficiency((short) 2);
        HashMap<String, Short> abilityScores = new HashMap<>();
        abilityScores.put("Strength", (short) 12);
        stats.setAbilityScores(abilityScores);
        stats.setProficiencies(new HashMap<>());
        stats.setVelocities(List.of(30L));
        stats.setHp(20);
        character.setCharacterStats(stats);

        when(characterRepository.findDemoById(10L)).thenReturn(Optional.of(character));
        when(levelRepository.findByIdCharacterId(10L)).thenReturn(List.of());

        Optional<DemoCharacterDetailDto> result = demoService().findCharacterDetail(10L);

        assertThat(result).isPresent();
        DemoCharacterDetailDto dto = result.get();
        assertThat(dto.getId()).isEqualTo(10L);
        assertThat(dto.getName()).isEqualTo("Aria Windwhisper");
        assertThat(dto.getRaceName()).isEqualTo("Elf");
        assertThat(dto.getRacialFeats()).containsExactly("Darkvision");
        assertThat(dto.getBackground()).isEqualTo("A wandering scout.");
        assertThat(dto.getProficiency()).isEqualTo((short) 2);
        assertThat(dto.getAbilityScores()).containsEntry("Strength", (short) 12);
        assertThat(dto.getVelocity()).isEqualTo(30L);
        assertThat(dto.getHp()).isEqualTo(20);
        assertThat(dto.getClasses()).isEmpty();
        assertThat(fieldNames(DemoCharacterDetailDto.class)).doesNotContain("user");
    }

    @Test
    void findCharacterDetail_handlesMissingCharacterStatsAndClasses_gracefully() {
        RaceEntity race = RaceEntity.builder().id(3L).name("Human").racialFeats(List.of()).build();
        CharacterEntity character = new CharacterEntity();
        character.setId(11L);
        character.setUser(demoUser());
        character.setName("Borin Stonefist");
        character.setRace(race);
        character.setIsDemo(true);
        // No characterStats seeded (matches current DemoInitializer output).

        when(characterRepository.findDemoById(11L)).thenReturn(Optional.of(character));
        when(levelRepository.findByIdCharacterId(11L)).thenReturn(List.of());

        Optional<DemoCharacterDetailDto> result = demoService().findCharacterDetail(11L);

        assertThat(result).isPresent();
        DemoCharacterDetailDto dto = result.get();
        assertThat(dto.getClasses()).isEmpty();
        assertThat(dto.getProficiency()).isNull();
        assertThat(dto.getAbilityScores()).isEmpty();
        assertThat(dto.getVelocity()).isNull();
        assertThat(dto.getHp()).isNull();
    }

    @Test
    void findCharacterDetail_returnsEmpty_whenCharacterIsNotDemo() {
        when(characterRepository.findDemoById(999L)).thenReturn(Optional.empty());

        Optional<DemoCharacterDetailDto> result = demoService().findCharacterDetail(999L);

        assertThat(result).isEmpty();
    }

    private static List<String> fieldNames(Class<?> type) {
        return java.util.Arrays.stream(type.getDeclaredFields()).map(java.lang.reflect.Field::getName).toList();
    }
}
