package com.plans.chat.repo;

import com.plans.chat.entity.ChatRoomMember;
import com.plans.chat.entity.ChatRoomMemberId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, ChatRoomMemberId> {
    List<ChatRoomMember> findByChatIdAndActiveTrue(UUID chatId);
    List<ChatRoomMember> findByChatIdInAndActiveTrue(List<UUID> chatIds);
    Optional<ChatRoomMember> findByChatIdAndUserId(UUID chatId, UUID userId);
    List<ChatRoomMember> findByUserIdAndActiveTrue(UUID userId);
}
