package com.plans.chat.room;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plans.auth.entity.User;
import com.plans.auth.repo.UserRepository;
import com.plans.chat.entity.ChatRoomMember;
import com.plans.chat.entity.ChatRoom;
import com.plans.chat.entity.ChatRoomType;
import com.plans.chat.entity.Message;
import com.plans.chat.entity.MessageType;
import com.plans.chat.realtime.PresenceService;
import com.plans.chat.repo.ChatRoomMemberRepository;
import com.plans.chat.repo.MessageRepository;
import com.plans.chat.security.CurrentUser;
import java.time.Instant;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat/v1/rooms")
public class ChatRoomController {
    private final ChatRoomService roomService;
    private final CurrentUser currentUser;
    private final ChatRoomMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final ObjectMapper objectMapper;
    private final PresenceService presenceService;

    public ChatRoomController(
        ChatRoomService roomService,
        CurrentUser currentUser,
        ChatRoomMemberRepository memberRepository,
        UserRepository userRepository,
        MessageRepository messageRepository,
        ObjectMapper objectMapper,
        PresenceService presenceService
    ) {
        this.roomService = roomService;
        this.currentUser = currentUser;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
        this.objectMapper = objectMapper;
        this.presenceService = presenceService;
    }

    @PostMapping
    public RoomResponse create(@Valid @RequestBody CreateRoomRequest request, Principal principal) {
        ChatRoom room = roomService.create(request, currentUser.userId(principal));
        return RoomResponse.from(room, 0);
    }

    @GetMapping
    public List<RoomResponse> list(@RequestParam(defaultValue = "50") int limit, Principal principal) {
        UUID userId = currentUser.userId(principal);
        List<ChatRoom> rooms = roomService.list(userId, limit);
        var unread = roomService.unreadByRoom(userId, rooms);
        return enrichRooms(rooms, userId, unread);
    }

    @GetMapping("/{roomId}")
    public RoomResponse get(@PathVariable UUID roomId, Principal principal) {
        UUID userId = currentUser.userId(principal);
        ChatRoom room = roomService.getForActiveMember(roomId, userId);
        long unread = roomService.unreadByRoom(userId, List.of(room)).getOrDefault(roomId, 0L);
        return enrichRooms(List.of(room), userId, Map.of(roomId, unread)).get(0);
    }

    private List<RoomResponse> enrichRooms(List<ChatRoom> rooms, UUID currentUserId, Map<UUID, Long> unreadByRoom) {
        if (rooms.isEmpty()) return List.of();
        List<UUID> roomIds = rooms.stream().map(ChatRoom::getId).toList();
        Map<UUID, List<ChatRoomMember>> membersByRoom = memberRepository.findByChatIdInAndActiveTrue(roomIds).stream()
            .collect(Collectors.groupingBy(ChatRoomMember::getChatId));

        List<UUID> targetUserIds = rooms.stream()
            .filter(r -> r.getType() == ChatRoomType.DIRECT)
            .map(r -> membersByRoom.getOrDefault(r.getId(), List.of()).stream()
                .map(ChatRoomMember::getUserId)
                .filter(id -> !id.equals(currentUserId))
                .findFirst()
                .orElse(null))
            .filter(id -> id != null)
            .toList();
        Map<UUID, User> usersById = userRepository.findAllById(targetUserIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));

        List<UUID> messageIds = rooms.stream()
            .map(ChatRoom::getLastMessageId)
            .filter(id -> id != null)
            .toList();
        Map<UUID, Message> messagesById = new HashMap<>();
        for (Message m : messageRepository.findAllById(messageIds)) {
            messagesById.put(m.getId(), m);
        }

        return rooms.stream().map(room -> {
            UUID roomId = room.getId();
            String displayName = room.getTitle();
            String counterpartUserId = null;
            boolean counterpartOnline = false;
            Instant counterpartLastSeen = null;
            if (room.getType() == ChatRoomType.DIRECT) {
                UUID otherUserId = membersByRoom.getOrDefault(roomId, List.of()).stream()
                    .map(ChatRoomMember::getUserId)
                    .filter(id -> !id.equals(currentUserId))
                    .findFirst()
                    .orElse(null);
                counterpartUserId = otherUserId == null ? null : otherUserId.toString();
                if (otherUserId != null) {
                    counterpartOnline = presenceService.isOnline(otherUserId);
                    counterpartLastSeen = presenceService.lastSeen(otherUserId);
                }
                User other = otherUserId == null ? null : usersById.get(otherUserId);
                if (other != null && other.getDisplayName() != null && !other.getDisplayName().isBlank()) {
                    displayName = other.getDisplayName();
                } else if (otherUserId != null) {
                    displayName = otherUserId.toString();
                }
            }
            if (displayName == null || displayName.isBlank()) displayName = "Chat";
            Message last = room.getLastMessageId() == null ? null : messagesById.get(room.getLastMessageId());
            String preview = preview(last);
            Instant ts = last != null ? last.getCreatedAt() : room.getLastMessageAt();
            return RoomResponse.from(
                room,
                unreadByRoom.getOrDefault(roomId, 0L),
                displayName,
                counterpartUserId,
                counterpartOnline,
                counterpartLastSeen,
                preview,
                ts
            );
        }).toList();
    }

    private String preview(Message m) {
        if (m == null) return "";
        if (m.getType() == MessageType.IMAGE) return "Photo";
        if (m.getType() == MessageType.VIDEO) return "Video";
        if (m.getType() == MessageType.LOCATION) return "Location";
        if (m.getType() == MessageType.SYSTEM) return "System update";
        try {
            JsonNode root = objectMapper.readTree(m.getBodyJson());
            JsonNode text = root.get("text");
            if (text != null && !text.isNull()) return text.asText("");
        } catch (Exception ignored) {
        }
        return m.getBodyJson() == null ? "" : m.getBodyJson();
    }
}
