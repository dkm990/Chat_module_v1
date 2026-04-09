package com.plans.chat.message;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MessagePageResponse(
    List<MessageResponse> items,
    Instant nextCursorCreatedAt,
    UUID nextCursorId
) {
}
