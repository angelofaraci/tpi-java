package com.utn.javaproject.dndsheets.services;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    /**
     * Stores the given file and returns a URL the client can use to fetch it back.
     */
    String store(MultipartFile file);

    /**
     * Deletes the file corresponding to the given URL.
     * No-op if portraitUrl is null or blank.
     */
    void delete(String portraitUrl);
}
