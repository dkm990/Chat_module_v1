package com.plans.chat.room;

import com.plans.chat.entity.ChatRoom;
import com.plans.chat.entity.ChatRoomType;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ChatIntegrationFacade {
    private final ChatRoomService roomService;

    public ChatIntegrationFacade(ChatRoomService roomService) {
        this.roomService = roomService;
    }

    public ChatRoom ensureEventChat(UUID eventId, UUID actorId) {
        return roomService.create(new CreateRoomRequest(ChatRoomType.EVENT, "Event chat", eventId, null, List.of(actorId), null), actorId);
    }

    public ChatRoom ensureVenueChat(UUID venueId, UUID actorId) {
        return roomService.create(new CreateRoomRequest(ChatRoomType.VENUE, "Venue chat", null, venueId, List.of(actorId), null), actorId);
    }
}
