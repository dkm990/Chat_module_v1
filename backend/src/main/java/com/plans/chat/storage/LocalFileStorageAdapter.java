package com.plans.chat.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Component
public class LocalFileStorageAdapter implements AttachmentStorage {
    private final Path rootPath;

    public LocalFileStorageAdapter(@Value("${app.storage.root-path}") String rootPath) throws IOException {
        this.rootPath = Path.of(rootPath);
        Files.createDirectories(this.rootPath);
    }

    @Override
    public StoredFile store(MultipartFile file) throws IOException {
        String key = UUID.randomUUID() + "_" + sanitizeOriginalFilename(file.getOriginalFilename());
        Path target = rootPath.resolve(key).normalize();
        if (!target.startsWith(rootPath.normalize())) {
            throw new IOException("Invalid upload target path");
        }
        Files.copy(file.getInputStream(), target);
        return new StoredFile(key, getPublicUrl(key), file.getContentType(), file.getSize());
    }

    @Override
    public void delete(String storageKey) throws IOException {
        Files.deleteIfExists(rootPath.resolve(storageKey));
    }

    @Override
    public String getPublicUrl(String storageKey) {
        return "/uploads/chat/" + storageKey;
    }

    private static String sanitizeOriginalFilename(String originalFilename) {
        String cleaned = StringUtils.cleanPath(originalFilename == null ? "" : originalFilename);
        String basename = Path.of(cleaned.isBlank() ? "file" : cleaned).getFileName().toString();
        String sanitized = basename.replaceAll("[^A-Za-z0-9._-]", "_");
        return sanitized.isBlank() ? "file" : sanitized;
    }
}
