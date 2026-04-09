package com.plans.chat.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class ChatRoomMemberId implements Serializable {
    private UUID chatId;
    private UUID userId;

    public ChatRoomMemberId() {
    }

    public ChatRoomMemberId(UUID chatId, UUID userId) {
        this.chatId = chatId;
        this.userId = userId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ChatRoomMemberId that)) return false;
        return Objects.equals(chatId, that.chatId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(chatId, userId);
    }
}
