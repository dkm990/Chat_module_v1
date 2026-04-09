package com.plans.chat.message;

import com.plans.chat.security.CurrentUser;
import jakarta.validation.Valid;
import java.security.Principal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat/v1/rooms/{roomId}")
public class MessageController {
    private final MessageService messageService;
    private final CurrentUser currentUser;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageController(
        MessageService messageService,
        CurrentUser currentUser,
        SimpMessagingTemplate messagingTemplate
    ) {
        this.messageService = messageService;
        this.currentUser = currentUser;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/messages")
    public MessagePageResponse history(
        @PathVariable UUID roomId,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "30") int limit,
        Principal principal
    ) {
        UUID userId = currentUser.userId(principal);
        Instant cursorCreatedAt = null;
        UUID cursorId = null;
        if (cursor != null && !cursor.isBlank()) {
            String[] parts = cursor.split("\\|");
            if (parts.length == 2) {
                cursorCreatedAt = Instant.parse(parts[0]);
                cursorId = UUID.fromString(parts[1]);
            }
        }
        return messageService.history(roomId, userId, cursorCreatedAt, cursorId, limit);
    }

    @PostMapping("/messages")
    public MessageResponse send(@PathVariable UUID roomId, @Valid @RequestBody SendMessageRequest request, Principal principal) {
        UUID userId = currentUser.userId(principal);
        MessageResponse response = messageService.send(roomId, userId, request);
        messagingTemplate.convertAndSend("/topic/rooms." + roomId + ".messages.created", response);
        messagingTemplate.convertAndSend("/topic/user." + userId + ".rooms.updated", Map.of("roomId", roomId));
        return response;
    }

    @PostMapping("/read")
    public Map<String, String> read(@PathVariable UUID roomId, @RequestBody Map<String, UUID> payload, Principal principal) {
        UUID userId = currentUser.userId(principal);
        UUID lastReadMessageId = payload.get("lastReadMessageId");
        messageService.markRead(roomId, userId, lastReadMessageId);
        messagingTemplate.convertAndSend(
            "/topic/rooms." + roomId + ".messages.read",
            Map.of("roomId", roomId, "userId", userId, "lastReadMessageId", lastReadMessageId)
        );
        messagingTemplate.convertAndSend("/topic/user." + userId + ".rooms.updated", Map.of("roomId", roomId));
        return Map.of("status", "ok");
    }
}
