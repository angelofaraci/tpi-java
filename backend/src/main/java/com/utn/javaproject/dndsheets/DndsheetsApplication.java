package com.utn.javaproject.dndsheets;

import com.utn.javaproject.dndsheets.interfaces.UserRepository;
import lombok.extern.java.Log;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@SpringBootApplication
@Log
public class DndsheetsApplication {
	@Autowired
	private UserRepository userRepository;
	public static void main(String[] args) { SpringApplication.run(DndsheetsApplication.class, args);}
}
