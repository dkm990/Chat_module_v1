package com.plans.chat.message;

import com.plans.chat.entity.AttachmentKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AttachmentPayload(
    @NotNull AttachmentKind kind,
    @NotBlank String storageKey,
    String publicUrl,
    @NotBlank String mimeType,
    long sizeBytes,
    Integer width,
    Integer height,
    Integer durationSec
) {
}
