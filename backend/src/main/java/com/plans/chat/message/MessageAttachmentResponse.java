package com.plans.chat.message;

import com.plans.chat.entity.AttachmentKind;

public record MessageAttachmentResponse(
    AttachmentKind kind,
    String storageKey,
    String publicUrl,
    String mimeType,
    long sizeBytes,
    Integer width,
    Integer height,
    Integer durationSec
) {
    public static MessageAttachmentResponse of(
        AttachmentKind kind,
        String storageKey,
        String publicUrl,
        String mimeType,
        long sizeBytes,
        Integer width,
        Integer height,
        Integer durationSec
    ) {
        return new MessageAttachmentResponse(
            kind,
            storageKey,
            normalizePublicUrl(publicUrl, storageKey),
            mimeType,
            sizeBytes,
            width,
            height,
            durationSec
        );
    }

    private static String normalizePublicUrl(String publicUrl, String storageKey) {
        if (publicUrl != null && !publicUrl.isBlank()) {
            return publicUrl;
        }
        if (storageKey == null || storageKey.isBlank()) {
            return null;
        }
        return "/uploads/chat/" + storageKey;
    }
}
