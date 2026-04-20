package com.utn.javaproject.dndsheets.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path portraitsDir;

    public FileStorageService(@Value("${app.upload.dir}") String uploadDir) throws IOException {
        this.portraitsDir = Paths.get(uploadDir).resolve("portraits").toAbsolutePath().normalize();
        Files.createDirectories(this.portraitsDir);
    }

    /**
     * Stores the given file and returns the relative URL path (e.g. /uploads/portraits/{uuid}.ext).
     */
    public String store(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = "." + originalFilename.substring(originalFilename.lastIndexOf('.') + 1);
        }
        String filename = UUID.randomUUID() + extension;
        Path targetPath = this.portraitsDir.resolve(filename);
        try {
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file " + filename, e);
        }
        return "/uploads/portraits/" + filename;
    }

    /**
     * Deletes the file corresponding to the given relative URL.
     * No-op if portraitUrl is null or blank.
     */
    public void delete(String portraitUrl) {
        if (portraitUrl == null || portraitUrl.isBlank()) {
            return;
        }
        // portraitUrl format: /uploads/portraits/{filename}
        String filename = Paths.get(portraitUrl).getFileName().toString();
        Path filePath = this.portraitsDir.resolve(filename).normalize();
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Log but do not rethrow — deletion failures should not block the caller
            System.err.println("Warning: could not delete portrait file: " + filePath);
        }
    }
}
