package com.utn.javaproject.dndsheets.services;

import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/**
 * Stores portraits in a Cloud Storage bucket. Used on Cloud Run, where the
 * container filesystem is ephemeral and does not survive across instances.
 * Authenticates via Application Default Credentials — on Cloud Run this is
 * the service account attached to the service, no key file needed.
 */
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "gcs")
public class GcsFileStorageService implements FileStorageService {

    private final Storage storage;
    private final String bucketName;

    public GcsFileStorageService(@Value("${app.storage.gcs.bucket}") String bucketName) {
        this.bucketName = bucketName;
        this.storage = StorageOptions.getDefaultInstance().getService();
    }

    @Override
    public String store(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = "." + originalFilename.substring(originalFilename.lastIndexOf('.') + 1);
        }
        String objectName = "portraits/" + UUID.randomUUID() + extension;

        BlobId blobId = BlobId.of(bucketName, objectName);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType(file.getContentType())
                .build();

        try {
            storage.create(blobInfo, file.getBytes());
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file " + objectName, e);
        }

        return "https://storage.googleapis.com/" + bucketName + "/" + objectName;
    }

    @Override
    public void delete(String portraitUrl) {
        if (portraitUrl == null || portraitUrl.isBlank()) {
            return;
        }
        String prefix = "https://storage.googleapis.com/" + bucketName + "/";
        if (!portraitUrl.startsWith(prefix)) {
            return;
        }
        String objectName = portraitUrl.substring(prefix.length());
        storage.delete(BlobId.of(bucketName, objectName));
    }
}
