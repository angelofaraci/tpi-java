package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
public class UserService {

    private final UserRepository userRepository;


    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserEntity save(UserEntity userEntity){
        return userRepository.save(userEntity);
    }

    public List<UserEntity> findAll(){
        return StreamSupport.stream(userRepository
                                .findAll()
                                .spliterator()
                        , false)
                .collect(Collectors.toList());
    }

    public UserEntity partialUpdate(Long id, UserEntity userEntity){
        userEntity.setId(id);
        return userRepository.findById(id).map(existingUser -> {
            Optional.ofNullable(userEntity.getEmail()).ifPresent(existingUser::setEmail);
            Optional.ofNullable(userEntity.getUsername()).ifPresent(existingUser::setUsername);
            Optional.ofNullable(userEntity.getPassword()).ifPresent(existingUser::setPassword);
            return userRepository.save(existingUser);
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public Optional<UserEntity> findOne(Long id){
        return userRepository.findById(id);
    }

    public boolean itExists(Long id){
        return userRepository.existsById(id);
    }

    public void deleteOne(Long id){
        userRepository.deleteById(id);
    }

    public Optional<UserEntity> findOneByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<UserEntity> findOneByEmail(String email) {
        return userRepository.findByEmail(email);
    }
}
