package com.plans.chat.room;

import com.plans.chat.entity.ChatRoom;
import com.plans.chat.entity.ChatRoomType;
import java.time.Instant;
import java.util.UUID;

public record RoomResponse(
    UUID id,
    ChatRoomType type,
    String title,
    UUID eventId,
    UUID venueId,
    UUID lastMessageId,
    Instant lastMessageAt,
    short typeVersion,
    long unreadCount,
    String displayName,
    String counterpartUserId,
    boolean counterpartOnline,
    Instant counterpartLastSeen,
    String lastMessagePreview,
    Instant lastMessageTimestamp
) {
    public static RoomResponse from(
        ChatRoom room,
        long unread,
        String displayName,
        String counterpartUserId,
        boolean counterpartOnline,
        Instant counterpartLastSeen,
        String preview,
        Instant ts
    ) {
        return new RoomResponse(
            room.getId(),
            room.getType(),
            room.getTitle(),
            room.getEventId(),
            room.getVenueId(),
            room.getLastMessageId(),
            room.getLastMessageAt(),
            room.getTypeVersion(),
            unread,
            displayName,
            counterpartUserId,
            counterpartOnline,
            counterpartLastSeen,
            preview,
            ts
        );
    }

    public static RoomResponse from(ChatRoom room, long unread) {
        String fallbackName = room.getTitle() == null || room.getTitle().isBlank() ? "Chat" : room.getTitle();
        return from(room, unread, fallbackName, null, false, null, "", room.getLastMessageAt());
    }
}
