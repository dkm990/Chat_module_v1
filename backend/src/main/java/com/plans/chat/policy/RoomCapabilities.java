package com.plans.chat.policy;

public record RoomCapabilities(
    boolean canSendMessage,
    boolean canSendAttachments,
    boolean canSendLocation,
    boolean canInviteParticipants,
    boolean canRemoveParticipants,
    boolean canLeaveRoom,
    boolean canViewParticipants,
    boolean canSeePresence,
    boolean canEditRoomMeta
) {
    public static RoomCapabilities denyAll() {
        return new RoomCapabilities(
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        );
    }
}

