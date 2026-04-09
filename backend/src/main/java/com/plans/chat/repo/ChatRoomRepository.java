package com.plans.chat.repo;

import com.plans.chat.entity.ChatRoom;
import com.plans.chat.entity.ChatRoomType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, UUID> {
    @Query("""
        select r from ChatRoom r
        join ChatRoomMember m on m.chatId = r.id
        where m.userId = :userId and m.active = true
        order by r.lastMessageAt desc nulls last
        """)
    java.util.List<ChatRoom> findUserRooms(UUID userId, Pageable pageable);

    Optional<ChatRoom> findByTypeAndEventId(ChatRoomType type, UUID eventId);
    Optional<ChatRoom> findByTypeAndVenueId(ChatRoomType type, UUID venueId);
}
