package com.plans.chat.realtime;

import com.plans.chat.message.MessageResponse;
import com.plans.chat.message.MessageService;
import com.plans.chat.message.SendMessageRequest;
import com.plans.chat.repo.ChatRoomMemberRepository;
import java.time.Instant;
import java.security.Principal;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class RealtimeChatController {
    private final MessageService messageService;
    private final ChatRoomMemberRepository memberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeChatController(
        MessageService messageService,
        ChatRoomMemberRepository memberRepository,
        SimpMessagingTemplate messagingTemplate
    ) {
        this.messageService = messageService;
        this.memberRepository = memberRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.send")
    public void send(@Payload WsSendMessageRequest request, Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        memberRepository.findByChatIdAndUserId(request.roomId(), userId)
            .filter(m -> m.isActive())
            .orElseThrow(() -> new IllegalStateException("Forbidden"));
        MessageResponse response = messageService.send(
            request.roomId(),
            userId,
            new SendMessageRequest(request.type(), request.bodyJson(), null, null, null, request.clientGeneratedId())
        );
        messagingTemplate.convertAndSend("/topic/rooms." + request.roomId() + ".messages.created", response);
        messagingTemplate.convertAndSend("/topic/user." + userId + ".rooms.updated", Map.of("roomId", request.roomId()));
    }

    @MessageMapping("/chat.read")
    public void read(@Payload WsReadRequest request, Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        messageService.markRead(request.roomId(), userId, request.lastReadMessageId());
        messagingTemplate.convertAndSend("/topic/rooms." + request.roomId() + ".messages.read",
            Map.of("roomId", request.roomId(), "userId", userId, "lastReadMessageId", request.lastReadMessageId()));
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload Map<String, Object> payload, Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        Object roomIdRaw = payload.get("roomId");
        Object stateRaw = payload.get("state");
        if (roomIdRaw == null || stateRaw == null) return;
        UUID roomId = UUID.fromString(String.valueOf(roomIdRaw));
        String state = String.valueOf(stateRaw);
        if (!Objects.equals(state, "start") && !Objects.equals(state, "stop")) return;
        memberRepository.findByChatIdAndUserId(roomId, userId)
            .filter(m -> m.isActive())
            .orElseThrow(() -> new IllegalStateException("Forbidden"));
        messagingTemplate.convertAndSend("/topic/rooms." + roomId + ".typing", Map.of(
            "roomId", roomId.toString(),
            "userId", userId.toString(),
            "state", state,
            "at", Instant.now().toString()
        ));
    }
}
