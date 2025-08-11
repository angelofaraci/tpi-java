package com.utn.javaproject.dndsheets.interfaces;

import com.utn.javaproject.dndsheets.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
}
