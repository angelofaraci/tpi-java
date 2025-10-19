package com.utn.javaproject.dndsheets.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, String>> getAdminDashboard() {
        return ResponseEntity.ok(Map.of(
                "message", "Welcome to the admin dashboard",
                "status", "success",
                "role", "ADMIN"
        ));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        return ResponseEntity.ok(Map.of(
                "totalUsers", 100,
                "totalCampaigns", 50,
                "totalCharacters", 250,
                "message", "Admin statistics retrieved successfully"
        ));
    }
}

