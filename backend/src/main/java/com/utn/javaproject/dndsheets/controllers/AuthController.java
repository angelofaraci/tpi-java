package com.utn.javaproject.dndsheets.controllers;

import com.utn.javaproject.dndsheets.domain.dto.CharacterDto;
import com.utn.javaproject.dndsheets.domain.dto.LoginDto;
import com.utn.javaproject.dndsheets.domain.dto.UserDto;
import com.utn.javaproject.dndsheets.domain.entities.AuthResponse;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.mappers.impl.UserMapperImpl;
import com.utn.javaproject.dndsheets.services.AuthService;
import com.utn.javaproject.dndsheets.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RequestMapping("/auth")
@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final UserMapperImpl mapper;
    private final PasswordEncoder passwordEncoder;

    @PostMapping(value = "/login")
    public ResponseEntity<?> login(@RequestBody UserDto request){
        UserEntity userEntity = mapper.mapFrom(request);
        if(userService.findOneByUsername(userEntity.getUsername()).isEmpty()){
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("The username is not registered");
        }

        try {
            AuthResponse token = authService.login(userEntity);
            return ResponseEntity.ok(token);
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("The password is incorrect");
        }
    }

    @PostMapping(value = "/register")
    public ResponseEntity<?> register(@RequestBody UserDto request){
        UserEntity userEntity = mapper.mapFrom(request);
        if(userService.findOneByUsername(userEntity.getUsername()).isPresent()){
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("The username is already registered");
        }

        if(userService.findOneByEmail(userEntity.getEmail()).isPresent()){
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("The email is already registered");
        }
        userEntity.setPassword(passwordEncoder.encode(userEntity.getPassword()));
        return new ResponseEntity<>(authService.register(userEntity), HttpStatus.CREATED);
    }

    @GetMapping(path = "/test/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable("id") Long id) {
        Optional<UserEntity> foundUser = userService.findOne(id);
        return foundUser.map(userEntity -> {
            UserDto userDto = mapper.mapTo(userEntity);
            return new ResponseEntity<>(userDto, HttpStatus.OK);
        }).orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

}
