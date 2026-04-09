package com.plans.chat.storage;

public record StoredFile(String storageKey, String publicUrl, String mimeType, long sizeBytes) {
}
