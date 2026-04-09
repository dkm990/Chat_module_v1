package com.plans.chat.room;

import com.plans.chat.entity.ChatRoomType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record CreateRoomRequest(
    @NotNull ChatRoomType type,
    @NotBlank String title,
    UUID eventId,
    UUID venueId,
    List<UUID> participantIds,
    UUID targetUserId
) {
}
