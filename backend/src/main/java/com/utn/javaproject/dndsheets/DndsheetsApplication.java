package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.repositories.UserRepository;
import lombok.extern.java.Log;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
@Log
public class DndsheetsApplication {
	@Autowired
	private UserRepository userRepository;
	public static void main(String[] args) {
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
		SpringApplication.run(DndsheetsApplication.class, args);
	}
}
