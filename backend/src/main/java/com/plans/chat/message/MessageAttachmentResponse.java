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
}
