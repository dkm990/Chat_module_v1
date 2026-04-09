package com.plans.chat.realtime;

import java.security.Principal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class PresenceEventListener {
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, UUID> sessionToUser = new ConcurrentHashMap<>();

    public PresenceEventListener(PresenceService presenceService, SimpMessagingTemplate messagingTemplate) {
        this.presenceService = presenceService;
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void onConnect(SessionConnectEvent event) {
        Principal user = event.getUser();
        if (user == null || user.getName() == null) return;
        UUID userId = UUID.fromString(user.getName());
        String sessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
        if (sessionId != null) {
            sessionToUser.put(sessionId, userId);
        }
        boolean becameOnline = presenceService.markOnline(userId);
        if (becameOnline) {
            messagingTemplate.convertAndSend("/topic/user." + userId + ".presence.changed",
                Map.of("userId", userId.toString(), "status", "online", "lastSeen", ""));
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        UUID userId = sessionToUser.remove(sessionId);
        if (userId == null) return;
        boolean becameOffline = presenceService.markOffline(userId);
        if (becameOffline) {
            Instant lastSeen = presenceService.lastSeen(userId);
            messagingTemplate.convertAndSend("/topic/user." + userId + ".presence.changed",
                Map.of(
                    "userId", userId.toString(),
                    "status", "offline",
                    "lastSeen", lastSeen == null ? "" : lastSeen.toString()
                ));
        }
    }
}
