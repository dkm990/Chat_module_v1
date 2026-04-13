package com.plans.chat.policy;

import com.plans.chat.entity.ChatRoom;
import com.plans.chat.entity.ChatRoomMember;
import com.plans.chat.entity.ChatRoomType;
import com.plans.chat.entity.MemberRole;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class RoomCapabilityEvaluator {
    private static final Logger log = LoggerFactory.getLogger(RoomCapabilityEvaluator.class);

    public RoomCapabilities evaluateCapabilities(ChatRoom room, ChatRoomMember actorParticipant, UUID actorUserId) {
        if (room == null || actorParticipant == null || !actorParticipant.isActive()) {
            log.debug("chat.capability.profile roomId={} actorUserId={} allowedProfile=denyAll", room == null ? "UNKNOWN" : room.getId(), actorUserId);
            return RoomCapabilities.denyAll();
        }

        boolean isElevated = actorParticipant.getRole() == MemberRole.OWNER || actorParticipant.getRole() == MemberRole.ADMIN;
        boolean roomArchived = isRoomArchived(room);
        boolean roomReadOnly = isRoomReadOnly(room);

        boolean canSendMessage = !roomArchived && !roomReadOnly;
        boolean canSendAttachments = canSendMessage;
        boolean canSendLocation = canSendMessage;
        boolean canInviteParticipants = room.getType() == ChatRoomType.GROUP && isElevated;
        boolean canRemoveParticipants = room.getType() == ChatRoomType.GROUP && isElevated;
        boolean canLeaveRoom = room.getType() != ChatRoomType.DIRECT;
        boolean canViewParticipants = true;
        boolean canSeePresence = room.getType() == ChatRoomType.DIRECT;
        boolean canEditRoomMeta = room.getType() == ChatRoomType.GROUP && isElevated;

        RoomCapabilities capabilities = new RoomCapabilities(
            canSendMessage,
            canSendAttachments,
            canSendLocation,
            canInviteParticipants,
            canRemoveParticipants,
            canLeaveRoom,
            canViewParticipants,
            canSeePresence,
            canEditRoomMeta
        );
        log.debug(
            "chat.capability.profile roomId={} actorUserId={} roomType={} actorRole={} canSendMessage={} canInviteParticipants={} canRemoveParticipants={} canLeaveRoom={} archived={} readOnly={}",
            room.getId(),
            actorUserId,
            room.getType(),
            actorParticipant.getRole(),
            capabilities.canSendMessage(),
            capabilities.canInviteParticipants(),
            capabilities.canRemoveParticipants(),
            capabilities.canLeaveRoom(),
            roomArchived,
            roomReadOnly
        );
        return capabilities;
    }

    public CapabilityDenyReason resolveDenyReason(
        CapabilityAction action,
        ChatRoom room,
        ChatRoomMember actorParticipant
    ) {
        if (room == null || actorParticipant == null || !actorParticipant.isActive()) {
            return CapabilityDenyReason.MEMBERSHIP_INACTIVE;
        }
        if (isRoomArchived(room)) {
            return CapabilityDenyReason.ROOM_ARCHIVED;
        }
        if (isRoomReadOnly(room)) {
            return CapabilityDenyReason.ROOM_READ_ONLY;
        }
        return switch (action) {
            case LEAVE_ROOM -> room.getType() == ChatRoomType.DIRECT
                ? CapabilityDenyReason.DIRECT_ROOM_LEAVE_FORBIDDEN
                : CapabilityDenyReason.CAPABILITY_NOT_ALLOWED;
            case INVITE_PARTICIPANTS, REMOVE_PARTICIPANTS -> room.getType() != ChatRoomType.GROUP
                ? CapabilityDenyReason.ROOM_TYPE_RESTRICTED
                : CapabilityDenyReason.ROLE_INSUFFICIENT;
            default -> CapabilityDenyReason.CAPABILITY_NOT_ALLOWED;
        };
    }

    public CapabilityDenyReason resolveRemoveTargetDenyReason(ChatRoomMember targetParticipant) {
        if (targetParticipant != null && targetParticipant.getRole() == MemberRole.OWNER) {
            return CapabilityDenyReason.TARGET_OWNER_PROTECTED;
        }
        return CapabilityDenyReason.CAPABILITY_NOT_ALLOWED;
    }

    public boolean canRemoveTarget(ChatRoomMember targetParticipant) {
        return targetParticipant == null || targetParticipant.getRole() != MemberRole.OWNER;
    }

    public boolean isRoomArchived(ChatRoom room) {
        // TODO: when moderation flags are introduced on ChatRoom, bind archived-state here.
        return false;
    }

    public boolean isRoomReadOnly(ChatRoom room) {
        // TODO: when moderation flags are introduced on ChatRoom, bind read-only-state here.
        return false;
    }
}
