package com.utn.javaproject.dndsheets.config;

import com.utn.javaproject.dndsheets.Role;
import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.RaceEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.RaceRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Seeds a fixed, idempotent demo dataset (1 campaign + 2 characters) owned by a
 * dedicated {@code demo} system user, so unauthenticated visitors have a stable
 * read-only sample to browse. Runs after Admin (1), Class (2), Campaign (3) and
 * Race (4) so the demo characters can reference an already-seeded race.
 */
@Component
@Order(5)
public class DemoInitializer implements CommandLineRunner {

    private static final String DEMO_CAMPAIGN_NAME = "Demo Campaign";
    private static final String DEMO_USERNAME = "demo";

    private final CampaignRepository campaignRepository;
    private final CharacterRepository characterRepository;
    private final UserRepository userRepository;
    private final RaceRepository raceRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoInitializer(CampaignRepository campaignRepository,
                            CharacterRepository characterRepository,
                            UserRepository userRepository,
                            RaceRepository raceRepository,
                            PasswordEncoder passwordEncoder) {
        this.campaignRepository = campaignRepository;
        this.characterRepository = characterRepository;
        this.userRepository = userRepository;
        this.raceRepository = raceRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (campaignRepository.existsByName(DEMO_CAMPAIGN_NAME)) {
            return;
        }

        List<RaceEntity> races = raceRepository.findAll();
        if (races.isEmpty()) {
            // RaceInitializer has not seeded yet (or races were removed); skip silently.
            return;
        }

        UserEntity demoUser = findOrCreateDemoUser();
        if (demoUser == null) {
            return;
        }

        CampaignEntity campaign = buildDemoCampaign(demoUser);
        CampaignEntity savedCampaign = saveCampaign(campaign);
        if (savedCampaign == null) {
            return;
        }

        RaceEntity firstRace = races.get(0);
        RaceEntity secondRace = races.size() > 1 ? races.get(1) : races.get(0);

        saveCharacter(buildDemoCharacter("Aria Windwhisper", firstRace, "Chaotic Good",
                "A wandering scout raised at the edge of the forest.", demoUser, savedCampaign));
        saveCharacter(buildDemoCharacter("Borin Stonefist", secondRace, "Lawful Neutral",
                "A steadfast guardian sworn to protect the demo party.", demoUser, savedCampaign));
    }

    private UserEntity findOrCreateDemoUser() {
        return userRepository.findByUsername(DEMO_USERNAME).orElseGet(() -> {
            UserEntity demoUser = new UserEntity();
            demoUser.setUsername(DEMO_USERNAME);
            demoUser.setEmail("demo@example.com");
            demoUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            demoUser.setRole(Role.ROLE_USER);
            try {
                return userRepository.save(demoUser);
            } catch (DataIntegrityViolationException ex) {
                // Handles concurrent startup races when another instance seeds first.
                return userRepository.findByUsername(DEMO_USERNAME).orElse(null);
            }
        });
    }

    private CampaignEntity buildDemoCampaign(UserEntity demoUser) {
        CampaignEntity campaign = new CampaignEntity();
        campaign.setDm(demoUser);
        campaign.setName(DEMO_CAMPAIGN_NAME);
        campaign.setDescription("A sample campaign for visitors to explore before signing up.");
        // Demo data must never leak into the authenticated "public campaigns" list,
        // whose semantics are driven exclusively by privacy=false. isDemo is orthogonal.
        campaign.setPrivacy(true);
        campaign.setIsDemo(true);
        campaign.setCreationDate(new Date());
        campaign.setPlayers(List.of());
        campaign.setCharacters(List.of());
        return campaign;
    }

    private CampaignEntity saveCampaign(CampaignEntity campaign) {
        try {
            return campaignRepository.save(campaign);
        } catch (DataIntegrityViolationException ex) {
            // Handles concurrent startup races when another instance seeds first.
            return null;
        }
    }

    private CharacterEntity buildDemoCharacter(String name, RaceEntity race, String alignment,
                                                String background, UserEntity demoUser, CampaignEntity campaign) {
        CharacterEntity character = new CharacterEntity();
        character.setUser(demoUser);
        character.setCampaign(campaign);
        character.setName(name);
        character.setRace(race);
        character.setAlignment(alignment);
        character.setBackground(background);
        character.setCharacteristics(List.of());
        character.setIsDemo(true);
        return character;
    }

    private void saveCharacter(CharacterEntity character) {
        try {
            characterRepository.save(character);
        } catch (DataIntegrityViolationException ex) {
            // Handles concurrent startup races when another instance seeds first.
        }
    }
}
