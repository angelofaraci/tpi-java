package com.utn.javaproject.dndsheets.config;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;

@Component
@Order(3)
public class CampaignInitializer implements CommandLineRunner {

    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;

    public CampaignInitializer(CampaignRepository campaignRepository, UserRepository userRepository) {
        this.campaignRepository = campaignRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        if (campaignRepository.existsByName("Starter Campaign")) {
            return;
        }

        UserEntity dm = userRepository.findByUsername("admin").orElse(null);
        if (dm == null) {
            return;
        }

        CampaignEntity campaign = new CampaignEntity();
        campaign.setDm(dm);
        campaign.setName("Starter Campaign");
        campaign.setDescription("Default campaign created during application startup.");
        campaign.setPrivacy(false);
        campaign.setCreationDate(new Date());
        campaign.setPlayers(List.of());
        campaign.setCharacters(List.of());

        try {
            campaignRepository.save(campaign);
        } catch (DataIntegrityViolationException ex) {
            // Handles concurrent startup races when another instance seeds first.
        }
    }
}
