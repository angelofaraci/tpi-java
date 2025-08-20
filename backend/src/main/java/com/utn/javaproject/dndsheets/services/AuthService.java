package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.Role;
import com.utn.javaproject.dndsheets.domain.dto.LoginDto;
import com.utn.javaproject.dndsheets.domain.dto.UserDto;
import com.utn.javaproject.dndsheets.domain.entities.AuthResponse;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;


    public AuthResponse login(UserEntity request) {

            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
            UserDetails user=userRepository.findByUsername(request.getUsername()).orElseThrow();
            String token=jwtService.getToken(user);
            return new AuthResponse(token);


    }

    public AuthResponse register(UserEntity request) {
        UserEntity userEntity = UserEntity.builder()
                .username(request.getUsername())
                .password(request.getPassword())
                .email(request.getEmail())
                .role(Role.USER)
                .build();
        userRepository.save(userEntity);
        return AuthResponse.builder()
                .token(jwtService.getToken(userEntity))
                .build();
    }
}
