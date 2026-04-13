package com.plans.chat.policy;

import com.plans.chat.entity.ChatRoom;
import com.plans.chat.entity.ChatRoomMember;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CapabilityGuard {
    private static final Logger log = LoggerFactory.getLogger(CapabilityGuard.class);
    private static final String DENY_CODE = "CHAT_CAPABILITY_DENIED";
    private static final String REASON_NONE = "NONE";

    public void requireCapability(
        ChatRoom room,
        ChatRoomMember actorParticipant,
        UUID actorUserId,
        CapabilityAction action,
        String capabilityName,
        boolean allowed,
        CapabilityDenyReason denyReason
    ) {
        if (allowed) {
            logDecision(room, actorParticipant, actorUserId, action, capabilityName, true, REASON_NONE);
            return;
        }
        logDecision(room, actorParticipant, actorUserId, action, capabilityName, false, denyReason.name());
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, DENY_CODE);
    }

    public void deny(
        ChatRoom room,
        ChatRoomMember actorParticipant,
        UUID actorUserId,
        CapabilityAction action,
        String capabilityName,
        CapabilityDenyReason denyReason
    ) {
        logDecision(room, actorParticipant, actorUserId, action, capabilityName, false, denyReason.name());
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, DENY_CODE);
    }

    private void logDecision(
        ChatRoom room,
        ChatRoomMember actorParticipant,
        UUID actorUserId,
        CapabilityAction action,
        String capabilityName,
        boolean allowed,
        String reasonCode
    ) {
        String role = actorParticipant == null || actorParticipant.getRole() == null
            ? "NONE"
            : actorParticipant.getRole().name();
        String roomType = room == null || room.getType() == null ? "UNKNOWN" : room.getType().name();
        String roomId = room == null || room.getId() == null ? "UNKNOWN" : room.getId().toString();
        String actorId = actorUserId == null ? "UNKNOWN" : actorUserId.toString();

        if (allowed) {
            log.debug(
                "chat.capability.check action={} capabilityName={} roomId={} actorUserId={} actorRole={} roomType={} allowed={} reasonCode={}",
                action.value(),
                capabilityName,
                roomId,
                actorId,
                role,
                roomType,
                true,
                reasonCode
            );
            return;
        }
        log.info(
            "chat.capability.check action={} capabilityName={} roomId={} actorUserId={} actorRole={} roomType={} allowed={} reasonCode={}",
            action.value(),
            capabilityName,
            roomId,
            actorId,
            role,
            roomType,
            false,
            reasonCode
        );
    }
}

