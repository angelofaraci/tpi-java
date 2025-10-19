package com.utn.javaproject.dndsheets.config;

import com.utn.javaproject.dndsheets.Role;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByUsername("admin").isEmpty()) {
            UserEntity admin = UserEntity.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .email("admin@example.com")
                    .role(Role.ROLE_ADMIN)
                    .build();
            userRepository.save(admin);
        }
    }
}

