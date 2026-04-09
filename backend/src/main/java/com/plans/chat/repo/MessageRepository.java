package com.plans.chat.repo;

import com.plans.chat.entity.Message;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    @Query("""
        select m from Message m
        where m.chatId = :chatId
        order by m.createdAt desc, m.id desc
        """)
    List<Message> findPageFirst(UUID chatId, Pageable pageable);

    @Query("""
        select m from Message m
        where m.chatId = :chatId
          and (m.createdAt < :cursorCreatedAt
             or (m.createdAt = :cursorCreatedAt and m.id < :cursorId))
        order by m.createdAt desc, m.id desc
        """)
    List<Message> findPage(UUID chatId, Instant cursorCreatedAt, UUID cursorId, Pageable pageable);

    long countByChatId(UUID chatId);
    long countByChatIdAndCreatedAtAfter(UUID chatId, Instant createdAt);
}
