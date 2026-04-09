package com.plans.chat.repo;

import com.plans.chat.entity.MessageReadState;
import com.plans.chat.entity.MessageReadStateId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageReadStateRepository extends JpaRepository<MessageReadState, MessageReadStateId> {
    Optional<MessageReadState> findByChatIdAndUserId(UUID chatId, UUID userId);
    List<MessageReadState> findByUserId(UUID userId);
}
