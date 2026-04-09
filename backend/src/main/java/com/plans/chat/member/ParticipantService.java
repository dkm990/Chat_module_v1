package com.plans.chat.member;

import com.plans.chat.entity.ChatRoomMember;
import com.plans.chat.entity.MemberRole;
import com.plans.chat.message.MessageResponse;
import com.plans.chat.message.MessageService;
import com.plans.chat.repo.ChatRoomMemberRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ParticipantService {
    private final ChatRoomMemberRepository memberRepository;
    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    public ParticipantService(
        ChatRoomMemberRepository memberRepository,
        MessageService messageService,
        SimpMessagingTemplate messagingTemplate
    ) {
        this.memberRepository = memberRepository;
        this.messageService = messageService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> activeParticipants(UUID roomId) {
        return memberRepository.findByChatIdAndActiveTrue(roomId).stream().map(ParticipantResponse::from).toList();
    }

    @Transactional
    public List<ParticipantResponse> addParticipants(UUID roomId, UUID actorId, List<UUID> userIds) {
        for (UUID userId : userIds) {
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
            messagingTemplate.convertAndSend("/topic/rooms." + roomId + ".members.changed", Map.of("roomId", roomId, "userId", userId, "active", true));
            notifyRoomsUpdated(roomId, userId, actorId);
        }
        return activeParticipants(roomId);
    }

    @Transactional
    public List<ParticipantResponse> removeParticipant(UUID roomId, UUID actorId, UUID userId) {
        memberRepository.findByChatIdAndUserId(roomId, userId).ifPresent(member -> {
            member.setActive(false);
            member.setLeftAt(Instant.now());
            memberRepository.save(member);
        });
        MessageResponse system = messageService.sendSystem(roomId, "MEMBER_REMOVED", actorId, userId);
        messagingTemplate.convertAndSend("/topic/rooms." + roomId + ".messages.created", system);
        messagingTemplate.convertAndSend("/topic/rooms." + roomId + ".members.changed", Map.of("roomId", roomId, "userId", userId, "active", false));
        notifyRoomsUpdated(roomId, userId, actorId);
        return activeParticipants(roomId);
    }

    @Transactional
    public void leave(UUID roomId, UUID userId) {
        memberRepository.findByChatIdAndUserId(roomId, userId).ifPresent(member -> {
            member.setActive(false);
            member.setLeftAt(Instant.now());
            memberRepository.save(member);
        });
        MessageResponse system = messageService.sendSystem(roomId, "MEMBER_LEFT", userId, null);
        messagingTemplate.convertAndSend("/topic/rooms." + roomId + ".messages.created", system);
        messagingTemplate.convertAndSend("/topic/rooms." + roomId + ".members.changed", Map.of("roomId", roomId, "userId", userId, "active", false));
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
}
