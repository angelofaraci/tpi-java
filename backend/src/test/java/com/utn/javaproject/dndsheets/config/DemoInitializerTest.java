package com.utn.javaproject.dndsheets.config;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.RaceEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.RaceRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DemoInitializerTest {

    @Mock
    private CampaignRepository campaignRepository;

    @Mock
    private CharacterRepository characterRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RaceRepository raceRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private DemoInitializer demoInitializer() {
        return new DemoInitializer(campaignRepository, characterRepository, userRepository, raceRepository, passwordEncoder);
    }

    @Test
    void run_seedsOneDemoCampaignAndTwoDemoCharacters_onFirstStartup() {
        // GIVEN no demo data exists yet, and races have already been seeded
        when(campaignRepository.existsByName("Demo Campaign")).thenReturn(false);
        when(userRepository.findByUsername("demo")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");

        RaceEntity human = RaceEntity.builder().id(1L).name("Human").build();
        RaceEntity elf = RaceEntity.builder().id(2L).name("Elf").build();
        when(raceRepository.findAll()).thenReturn(List.of(human, elf));

        UserEntity savedDemoUser = UserEntity.builder().username("demo").build();
        setId(savedDemoUser, 500L);
        when(userRepository.save(any())).thenReturn(savedDemoUser);

        when(characterRepository.existsByDemoSlug(any())).thenReturn(false);
        when(campaignRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(characterRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        // WHEN
        demoInitializer().run();

        // THEN exactly one demo campaign is created, flagged as demo, and stays private
        ArgumentCaptor<CampaignEntity> campaignCaptor = ArgumentCaptor.forClass(CampaignEntity.class);
        verify(campaignRepository, times(1)).save(campaignCaptor.capture());
        CampaignEntity savedCampaign = campaignCaptor.getValue();
        assertThat(savedCampaign.getIsDemo()).isTrue();
        assertThat(savedCampaign.getPrivacy()).isTrue();
        assertThat(savedCampaign.getDm().getUsername()).isEqualTo("demo");

        // AND exactly two demo characters are created, both flagged as demo with distinct slugs
        ArgumentCaptor<CharacterEntity> characterCaptor = ArgumentCaptor.forClass(CharacterEntity.class);
        verify(characterRepository, times(2)).save(characterCaptor.capture());
        List<CharacterEntity> savedCharacters = characterCaptor.getAllValues();
        assertThat(savedCharacters).hasSize(2);
        assertThat(savedCharacters).allMatch(c -> Boolean.TRUE.equals(c.getIsDemo()));
        assertThat(savedCharacters).allMatch(c -> "demo".equals(c.getUser().getUsername()));
        assertThat(savedCharacters).extracting(CharacterEntity::getDemoSlug)
                .containsExactlyInAnyOrder("aria-windwhisper", "borin-stonefist");
    }

    @Test
    void saveCharacter_skipsInsert_whenAnotherInstanceAlreadySeededThatSlug() {
        // GIVEN no demo campaign yet in this instance's view, but a concurrent instance
        // has already inserted a character with the same demoSlug
        when(campaignRepository.existsByName("Demo Campaign")).thenReturn(false);
        when(userRepository.findByUsername("demo")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");
        RaceEntity human = RaceEntity.builder().id(1L).name("Human").build();
        when(raceRepository.findAll()).thenReturn(List.of(human));
        UserEntity savedDemoUser = UserEntity.builder().username("demo").build();
        setId(savedDemoUser, 500L);
        when(userRepository.save(any())).thenReturn(savedDemoUser);
        when(campaignRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(characterRepository.existsByDemoSlug(any())).thenReturn(true);

        // WHEN
        demoInitializer().run();

        // THEN this instance backs off instead of racing the unique constraint
        verify(characterRepository, never()).save(any());
    }

    @Test
    void saveCharacter_backsOff_whenConcurrentInsertViolatesUniqueDemoSlug() {
        // GIVEN the existence check races past a concurrent instance's insert, so the
        // DB-level unique constraint on demoSlug is the only remaining guard
        when(campaignRepository.existsByName("Demo Campaign")).thenReturn(false);
        when(userRepository.findByUsername("demo")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");
        RaceEntity human = RaceEntity.builder().id(1L).name("Human").build();
        when(raceRepository.findAll()).thenReturn(List.of(human));
        UserEntity savedDemoUser = UserEntity.builder().username("demo").build();
        setId(savedDemoUser, 500L);
        when(userRepository.save(any())).thenReturn(savedDemoUser);
        when(campaignRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(characterRepository.existsByDemoSlug(any())).thenReturn(false);
        when(characterRepository.save(any())).thenThrow(new DataIntegrityViolationException("unique violation"));

        // WHEN / THEN the exception is swallowed, not propagated
        demoInitializer().run();
        verify(characterRepository, times(2)).save(any());
    }

    @Test
    void run_stopsBeforeCharacters_whenConcurrentInstanceWinsCampaignRace() {
        // GIVEN this instance loses the isDemo-unique race on the campaign insert
        when(campaignRepository.existsByName("Demo Campaign")).thenReturn(false);
        when(userRepository.findByUsername("demo")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");
        RaceEntity human = RaceEntity.builder().id(1L).name("Human").build();
        when(raceRepository.findAll()).thenReturn(List.of(human));
        UserEntity savedDemoUser = UserEntity.builder().username("demo").build();
        setId(savedDemoUser, 500L);
        when(userRepository.save(any())).thenReturn(savedDemoUser);
        when(campaignRepository.save(any())).thenThrow(new DataIntegrityViolationException("unique violation"));

        // WHEN
        demoInitializer().run();

        // THEN no character rows are attempted for the campaign this instance failed to own
        verify(characterRepository, never()).save(any());
    }

    @Test
    void run_doesNotDuplicateData_whenRunTwice() {
        // GIVEN the demo campaign already exists from a prior startup
        when(campaignRepository.existsByName("Demo Campaign")).thenReturn(true);

        // WHEN the initializer runs again
        demoInitializer().run();

        // THEN no new campaign, character, or user rows are created
        verify(campaignRepository, never()).save(any());
        verify(characterRepository, never()).save(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void run_doesNothing_whenRacesAreNotSeededYet() {
        // GIVEN no demo campaign yet, but RaceInitializer has not run before this one
        when(campaignRepository.existsByName("Demo Campaign")).thenReturn(false);
        when(raceRepository.findAll()).thenReturn(List.of());

        // WHEN
        demoInitializer().run();

        // THEN the initializer silently skips seeding instead of failing
        verify(campaignRepository, never()).save(any());
        verify(characterRepository, never()).save(any());
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
