package com.plans.chat.member;

import com.plans.chat.entity.ChatRoomMember;
import com.plans.chat.entity.MemberRole;
import java.time.Instant;
import java.util.UUID;

public record ParticipantResponse(
    UUID userId,
    MemberRole role,
    Instant joinedAt,
    Instant lastSeenAt
) {
    public static ParticipantResponse from(ChatRoomMember m) {
        return new ParticipantResponse(m.getUserId(), m.getRole(), m.getJoinedAt(), m.getLastSeenAt());
    }
}
