package com.plans.chat.storage;

import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

public interface AttachmentStorage {
    StoredFile store(MultipartFile file) throws IOException;
    void delete(String storageKey) throws IOException;
    String getPublicUrl(String storageKey);
}
