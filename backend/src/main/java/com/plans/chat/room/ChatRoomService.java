package com.plans.chat.room;

import com.plans.chat.entity.ChatRoom;
import com.plans.chat.entity.ChatRoomMember;
import com.plans.chat.entity.ChatRoomType;
import com.plans.chat.entity.MemberRole;
import com.plans.chat.entity.Message;
import com.plans.chat.entity.MessageReadState;
import com.plans.chat.repo.ChatRoomMemberRepository;
import com.plans.chat.repo.ChatRoomRepository;
import com.plans.chat.repo.MessageReadStateRepository;
import com.plans.chat.repo.MessageRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatRoomService {
    private final ChatRoomRepository roomRepository;
    private final ChatRoomMemberRepository memberRepository;
    private final MessageReadStateRepository readStateRepository;
    private final MessageRepository messageRepository;

    public ChatRoomService(
        ChatRoomRepository roomRepository,
        ChatRoomMemberRepository memberRepository,
        MessageReadStateRepository readStateRepository,
        MessageRepository messageRepository
    ) {
        this.roomRepository = roomRepository;
        this.memberRepository = memberRepository;
        this.readStateRepository = readStateRepository;
        this.messageRepository = messageRepository;
    }

    @Transactional
    public ChatRoom create(CreateRoomRequest request, UUID actorId) {
        if (request.type() == ChatRoomType.EVENT && request.eventId() != null) {
            return roomRepository.findByTypeAndEventId(ChatRoomType.EVENT, request.eventId()).orElseGet(() -> createNew(request, actorId));
        }
        if (request.type() == ChatRoomType.VENUE && request.venueId() != null) {
            return roomRepository.findByTypeAndVenueId(ChatRoomType.VENUE, request.venueId()).orElseGet(() -> createNew(request, actorId));
        }
        return createNew(request, actorId);
    }

    private ChatRoom createNew(CreateRoomRequest request, UUID actorId) {
        List<UUID> members = resolveMembers(request, actorId);
        ChatRoom room = new ChatRoom();
        room.setId(UUID.randomUUID());
        room.setType(request.type());
        room.setTitle(request.title());
        room.setEventId(request.eventId());
        room.setVenueId(request.venueId());
        room.setTypeVersion((short) 1);
        room.setCreatedAt(Instant.now());
        room.setUpdatedAt(Instant.now());

        if (request.type() == ChatRoomType.DIRECT && members.size() == 2) {
            List<UUID> sorted = members.stream().sorted(Comparator.naturalOrder()).toList();
            room.setDirectUserLow(sorted.get(0));
            room.setDirectUserHigh(sorted.get(1));
        }
        roomRepository.save(room);

        for (UUID memberId : members) {
            ChatRoomMember member = new ChatRoomMember();
            member.setChatId(room.getId());
            member.setUserId(memberId);
            member.setRole(memberId.equals(actorId) ? MemberRole.OWNER : MemberRole.MEMBER);
            member.setJoinedAt(Instant.now());
            member.setActive(true);
            memberRepository.save(member);
        }
        return room;
    }

    private List<UUID> resolveMembers(CreateRoomRequest request, UUID actorId) {
        if (request.type() == ChatRoomType.DIRECT) {
            if (request.targetUserId() == null) {
                throw new IllegalArgumentException("targetUserId is required for DIRECT room");
            }
            if (request.targetUserId().equals(actorId)) {
                throw new IllegalArgumentException("targetUserId must be different from current user");
            }
            return List.of(actorId, request.targetUserId());
        }
        List<UUID> members = new ArrayList<>();
        if (request.participantIds() != null) {
            members.addAll(request.participantIds());
        }
        if (!members.contains(actorId)) {
            members.add(actorId);
        }
        if (members.isEmpty()) {
            throw new IllegalArgumentException("No participants provided");
        }
        return members;
    }

    @Transactional(readOnly = true)
    public List<ChatRoom> list(UUID userId, int limit) {
        return roomRepository.findUserRooms(userId, PageRequest.of(0, limit));
    }

    @Transactional(readOnly = true)
    public Map<UUID, Long> unreadByRoom(UUID userId, List<ChatRoom> rooms) {
        Map<UUID, Long> unread = new HashMap<>();
        Map<UUID, MessageReadState> states = readStateRepository.findByUserId(userId).stream()
            .collect(java.util.stream.Collectors.toMap(MessageReadState::getChatId, s -> s, (a, b) -> b));
        Map<UUID, ChatRoomMember> members = memberRepository.findByUserIdAndActiveTrue(userId).stream()
            .collect(java.util.stream.Collectors.toMap(ChatRoomMember::getChatId, m -> m, (a, b) -> b));

        for (ChatRoom room : rooms) {
            MessageReadState state = states.get(room.getId());
            if (state != null && state.getLastReadMessageId() != null) {
                Instant ts = messageRepository.findById(state.getLastReadMessageId()).map(Message::getCreatedAt).orElse(null);
                unread.put(room.getId(), ts == null ? messageRepository.countByChatId(room.getId()) : messageRepository.countByChatIdAndCreatedAtAfter(room.getId(), ts));
                continue;
            }
            ChatRoomMember member = members.get(room.getId());
            if (member != null && member.getLastSeenAt() != null) {
                unread.put(room.getId(), messageRepository.countByChatIdAndCreatedAtAfter(room.getId(), member.getLastSeenAt()));
            } else {
                unread.put(room.getId(), messageRepository.countByChatId(room.getId()));
            }
        }
        return unread;
    }

    @Transactional(readOnly = true)
    public ChatRoom get(UUID roomId) {
        return roomRepository.findById(roomId).orElseThrow();
    }

    @Transactional(readOnly = true)
    public ChatRoom getForActiveMember(UUID roomId, UUID userId) {
        memberRepository.findByChatIdAndUserId(roomId, userId)
            .filter(ChatRoomMember::isActive)
            .orElseThrow(() -> new IllegalStateException("Forbidden"));
        return roomRepository.findById(roomId).orElseThrow();
    }
}
