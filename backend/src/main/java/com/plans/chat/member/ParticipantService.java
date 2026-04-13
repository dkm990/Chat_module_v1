package com.plans.chat.member;

import com.plans.chat.entity.ChatRoom;
import com.plans.chat.entity.ChatRoomMember;
import com.plans.chat.entity.MemberRole;
import com.plans.chat.message.MessageResponse;
import com.plans.chat.message.MessageService;
import com.plans.chat.policy.CapabilityAction;
import com.plans.chat.policy.CapabilityDenyReason;
import com.plans.chat.policy.CapabilityGuard;
import com.plans.chat.policy.RoomCapabilities;
import com.plans.chat.policy.RoomCapabilityEvaluator;
import com.plans.chat.repo.ChatRoomMemberRepository;
import com.plans.chat.room.ChatRoomService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ParticipantService {
    private final ChatRoomMemberRepository memberRepository;
    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ChatRoomService roomService;
    private final RoomCapabilityEvaluator capabilityEvaluator;
    private final CapabilityGuard capabilityGuard;

    public ParticipantService(
        ChatRoomMemberRepository memberRepository,
        MessageService messageService,
        SimpMessagingTemplate messagingTemplate,
        ChatRoomService roomService,
        RoomCapabilityEvaluator capabilityEvaluator,
        CapabilityGuard capabilityGuard
    ) {
        this.memberRepository = memberRepository;
        this.messageService = messageService;
        this.messagingTemplate = messagingTemplate;
        this.roomService = roomService;
        this.capabilityEvaluator = capabilityEvaluator;
        this.capabilityGuard = capabilityGuard;
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> activeParticipants(UUID roomId) {
        return memberRepository.findByChatIdAndActiveTrue(roomId).stream().map(ParticipantResponse::from).toList();
    }

    @Transactional
    public List<ParticipantResponse> addParticipants(UUID roomId, UUID actorId, List<UUID> userIds) {
        ChatRoom room = roomService.getForActiveMember(roomId, actorId);
        ChatRoomMember actor = activeMemberOrForbidden(room, roomId, actorId, CapabilityAction.INVITE_PARTICIPANTS);
        RoomCapabilities capabilities = capabilityEvaluator.evaluateCapabilities(room, actor, actorId);
        capabilityGuard.requireCapability(
            room,
            actor,
            actorId,
            CapabilityAction.INVITE_PARTICIPANTS,
            "canInviteParticipants",
            capabilities.canInviteParticipants(),
            capabilityEvaluator.resolveDenyReason(CapabilityAction.INVITE_PARTICIPANTS, room, actor)
        );
        if (userIds == null || userIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userIds are required");
        }
        for (UUID userId : userIds) {
            if (userId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId cannot be null");
            }
            ChatRoomMember member = memberRepository.findByChatIdAndUserId(roomId, userId).orElseGet(() -> {
                ChatRoomMember m = new ChatRoomMember();
                m.setChatId(roomId);
                m.setUserId(userId);
                m.setRole(MemberRole.MEMBER);
                m.setJoinedAt(Instant.now());
                return m;
            });
            member.setActive(true);
            member.setLeftAt(null);
            memberRepository.save(member);
            MessageResponse system = messageService.sendSystem(roomId, "MEMBER_ADDED", actorId, userId);
            messagingTemplate.convertAndSend("/topic/rooms." + roomId + ".messages.created", system);
            messagingTemplate.convertAndSend(
                "/topic/rooms." + roomId + ".members.changed",
                Map.of("roomId", roomId, "userId", userId, "active", true)
            );
            notifyRoomsUpdated(roomId, userId, actorId);
        }
        return activeParticipants(roomId);
    }

    @Transactional
    public List<ParticipantResponse> removeParticipant(UUID roomId, UUID actorId, UUID userId) {
        ChatRoom room = roomService.getForActiveMember(roomId, actorId);
        ChatRoomMember actor = activeMemberOrForbidden(room, roomId, actorId, CapabilityAction.REMOVE_PARTICIPANTS);
        RoomCapabilities capabilities = capabilityEvaluator.evaluateCapabilities(room, actor, actorId);
        capabilityGuard.requireCapability(
            room,
            actor,
            actorId,
            CapabilityAction.REMOVE_PARTICIPANTS,
            "canRemoveParticipants",
            capabilities.canRemoveParticipants(),
            capabilityEvaluator.resolveDenyReason(CapabilityAction.REMOVE_PARTICIPANTS, room, actor)
        );
        if (actorId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use leave endpoint for current user");
        }
        ChatRoomMember target = memberRepository.findByChatIdAndUserId(roomId, userId)
            .filter(ChatRoomMember::isActive)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Participant not found"));
        if (!capabilityEvaluator.canRemoveTarget(target)) {
            capabilityGuard.deny(
                room,
                actor,
                actorId,
                CapabilityAction.REMOVE_PARTICIPANTS,
                "targetOwnerProtected",
                capabilityEvaluator.resolveRemoveTargetDenyReason(target)
            );
        }
        memberRepository.findByChatIdAndUserId(roomId, userId).ifPresent(member -> {
            member.setActive(false);
            member.setLeftAt(Instant.now());
            memberRepository.save(member);
        });
        MessageResponse system = messageService.sendSystem(roomId, "MEMBER_REMOVED", actorId, userId);
        messagingTemplate.convertAndSend("/topic/rooms." + roomId + ".messages.created", system);
        messagingTemplate.convertAndSend(
            "/topic/rooms." + roomId + ".members.changed",
            Map.of("roomId", roomId, "userId", userId, "active", false)
        );
        notifyRoomsUpdated(roomId, userId, actorId);
        return activeParticipants(roomId);
    }

    @Transactional
    public void leave(UUID roomId, UUID userId) {
        ChatRoom room = roomService.getForActiveMember(roomId, userId);
        ChatRoomMember actor = activeMemberOrForbidden(room, roomId, userId, CapabilityAction.LEAVE_ROOM);
        RoomCapabilities capabilities = capabilityEvaluator.evaluateCapabilities(room, actor, userId);
        capabilityGuard.requireCapability(
            room,
            actor,
            userId,
            CapabilityAction.LEAVE_ROOM,
            "canLeaveRoom",
            capabilities.canLeaveRoom(),
            capabilityEvaluator.resolveDenyReason(CapabilityAction.LEAVE_ROOM, room, actor)
        );
        memberRepository.findByChatIdAndUserId(roomId, userId).ifPresent(member -> {
            member.setActive(false);
            member.setLeftAt(Instant.now());
            memberRepository.save(member);
        });
        MessageResponse system = messageService.sendSystem(roomId, "MEMBER_LEFT", userId, null);
        messagingTemplate.convertAndSend("/topic/rooms." + roomId + ".messages.created", system);
        messagingTemplate.convertAndSend(
            "/topic/rooms." + roomId + ".members.changed",
            Map.of("roomId", roomId, "userId", userId, "active", false)
        );
        notifyRoomsUpdated(roomId, userId, userId);
    }

    private void notifyRoomsUpdated(UUID roomId, UUID affectedUserId, UUID actorId) {
        for (ChatRoomMember member : memberRepository.findByChatIdAndActiveTrue(roomId)) {
            messagingTemplate.convertAndSend("/topic/user." + member.getUserId() + ".rooms.updated", Map.of("roomId", roomId));
        }
        messagingTemplate.convertAndSend("/topic/user." + affectedUserId + ".rooms.updated", Map.of("roomId", roomId));
        if (actorId != null) {
            messagingTemplate.convertAndSend("/topic/user." + actorId + ".rooms.updated", Map.of("roomId", roomId));
        }
    }

    private ChatRoomMember activeMemberOrForbidden(ChatRoom room, UUID roomId, UUID userId, CapabilityAction action) {
        return memberRepository.findByChatIdAndUserId(roomId, userId)
            .filter(ChatRoomMember::isActive)
            .orElseThrow(() -> {
                capabilityGuard.deny(
                    room,
                    null,
                    userId,
                    action,
                    "activeMembership",
                    CapabilityDenyReason.MEMBERSHIP_INACTIVE
                );
                return new ResponseStatusException(HttpStatus.FORBIDDEN, "CHAT_CAPABILITY_DENIED");
            });
    }

}
