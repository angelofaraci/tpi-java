package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CampaignServiceTest {

    @Mock
    private CampaignRepository campaignRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CharacterRepository characterRepository;

    @InjectMocks
    private CampaignService campaignService;

    @Test
    void canAccess_returnsTrue_whenUserOwnsCharacterInPrivateCampaign() {
        // GIVEN a private campaign with a character owned by the user
        UserEntity characterOwner = UserEntity.builder()
                .username("character-owner")
                .email("owner@example.com")
                .password("secret")
                .build();
        // Simulate a persisted user with an ID
        setId(characterOwner, 42L);

        CharacterEntity ownedCharacter = CharacterEntity.builder()
                .name("Iria")
                .user(characterOwner)
                .build();

        CampaignEntity privateCampaign = CampaignEntity.builder()
                .name("Secret Dungeon")
                .privacy(true)
                .dm(UserEntity.builder().build()) // different DM
                .players(List.of())
                .characters(List.of(ownedCharacter))
                .build();
        // DM has a different ID — set it to avoid NPE in canAccess
        setId(privateCampaign.getDm(), 99L);

        when(userRepository.findByUsername("character-owner"))
                .thenReturn(Optional.of(characterOwner));

        // WHEN
        boolean result = campaignService.canAccess(privateCampaign, "character-owner");

        // THEN
        assertThat(result).isTrue();
    }

    @Test
    void canAccess_returnsFalse_whenUserOwnsNoCharacterInPrivateCampaignAndIsNotAPlayer() {
        // GIVEN a private campaign whose characters all belong to other users
        UserEntity campaignOwner = UserEntity.builder()
                .username("campaign-dm")
                .email("dm@example.com")
                .password("secret")
                .build();
        setId(campaignOwner, 1L);

        UserEntity characterOwner = UserEntity.builder()
                .username("character-owner")
                .email("charowner@example.com")
                .password("secret")
                .build();
        setId(characterOwner, 2L);

        UserEntity outsider = UserEntity.builder()
                .username("outsider")
                .email("outsider@example.com")
                .password("secret")
                .build();
        setId(outsider, 3L);

        CharacterEntity ownedByOther = CharacterEntity.builder()
                .name("Borin")
                .user(characterOwner)
                .build();

        CampaignEntity privateCampaign = CampaignEntity.builder()
                .name("Hidden Shrine")
                .privacy(true)
                .dm(campaignOwner)
                .players(List.of())
                .characters(List.of(ownedByOther))
                .build();

        when(userRepository.findByUsername("outsider"))
                .thenReturn(Optional.of(outsider));

        // WHEN
        boolean result = campaignService.canAccess(privateCampaign, "outsider");

        // THEN
        assertThat(result).isFalse();
    }

    @Test
    void countUniquePlayers_countsDmOwnedCharacterWithoutJoinTableRow() {
        // GIVEN campaign 9: 2 explicit campaign_players rows, plus a DM who owns
        // a character but has no row in campaign_players (Spec: "DM-owned character
        // without a join-table row still counts")
        UserEntity explicitPlayerOne = UserEntity.builder()
                .username("explicit-player-one")
                .email("explicit-one@example.com")
                .password("secret")
                .build();
        setId(explicitPlayerOne, 1L);

        UserEntity explicitPlayerTwo = UserEntity.builder()
                .username("explicit-player-two")
                .email("explicit-two@example.com")
                .password("secret")
                .build();
        setId(explicitPlayerTwo, 2L);

        UserEntity dmWithNoPlayerRow = UserEntity.builder()
                .username("dm-with-character")
                .email("dm-with-character@example.com")
                .password("secret")
                .build();
        setId(dmWithNoPlayerRow, 3L);

        CharacterEntity dmOwnedCharacter = CharacterEntity.builder()
                .name("DM's Hero")
                .user(dmWithNoPlayerRow)
                .build();

        CampaignEntity campaign = CampaignEntity.builder()
                .name("The Ninth Table")
                .dm(dmWithNoPlayerRow)
                .players(List.of(explicitPlayerOne, explicitPlayerTwo))
                .characters(List.of(dmOwnedCharacter))
                .build();

        // WHEN
        List<UserEntity> uniquePlayers = campaignService.resolveUniquePlayers(campaign);
        int count = campaignService.countUniquePlayers(campaign);

        // THEN
        assertThat(uniquePlayers).hasSize(3);
        assertThat(count).isEqualTo(3);
    }

    @Test
    void countUniquePlayers_dedupesUserPresentAsBothExplicitPlayerAndCharacterOwner() {
        // GIVEN a player who is both an explicit campaign_players row AND the owner
        // of a character in the same campaign — must not be counted twice
        UserEntity playerAndCharacterOwner = UserEntity.builder()
                .username("dual-role-player")
                .email("dual-role@example.com")
                .password("secret")
                .build();
        setId(playerAndCharacterOwner, 5L);

        CharacterEntity ownedCharacter = CharacterEntity.builder()
                .name("Dual Role Hero")
                .user(playerAndCharacterOwner)
                .build();

        CampaignEntity campaign = CampaignEntity.builder()
                .name("Overlap Table")
                .players(List.of(playerAndCharacterOwner))
                .characters(List.of(ownedCharacter))
                .build();

        // WHEN
        int count = campaignService.countUniquePlayers(campaign);

        // THEN
        assertThat(count).isEqualTo(1);
    }

    @Test
    void countCharacters_returnsSizeOfCampaignCharacters() {
        // GIVEN a campaign with 2 characters
        CharacterEntity characterOne = CharacterEntity.builder().name("Hero One").build();
        CharacterEntity characterTwo = CharacterEntity.builder().name("Hero Two").build();

        CampaignEntity campaign = CampaignEntity.builder()
                .name("Character Count Table")
                .characters(List.of(characterOne, characterTwo))
                .build();

        // WHEN / THEN
        assertThat(campaignService.countCharacters(campaign)).isEqualTo(2);
    }

    @Test
    void countCharacters_returnsZero_whenCharactersIsNull() {
        // GIVEN a campaign with no characters collection set
        CampaignEntity campaign = CampaignEntity.builder()
                .name("No Characters Table")
                .build();

        // WHEN / THEN
        assertThat(campaignService.countCharacters(campaign)).isEqualTo(0);
    }

    @Test
    void hasCharacters_returnsTrue_whenCampaignHasAtLeastOneCharacter() {
        when(characterRepository.existsByCampaignId(1L)).thenReturn(true);

        assertThat(campaignService.hasCharacters(1L)).isTrue();
    }

    @Test
    void hasCharacters_returnsFalse_whenCampaignHasNoCharacters() {
        when(characterRepository.existsByCampaignId(1L)).thenReturn(false);

        assertThat(campaignService.hasCharacters(1L)).isFalse();
    }

    // Helper to set the ID field via reflection (entities use @GeneratedValue)
    private static void setId(UserEntity entity, Long id) {
        try {
            var field = UserEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set id via reflection", e);
        }
    }
}
