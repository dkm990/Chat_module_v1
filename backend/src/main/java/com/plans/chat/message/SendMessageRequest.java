package com.plans.chat.message;

import com.plans.chat.entity.MessageType;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record SendMessageRequest(
    @NotNull MessageType type,
    String bodyJson,
    String text,
    LocationPayload location,
    List<AttachmentPayload> attachments,
    UUID clientGeneratedId
) {
}
