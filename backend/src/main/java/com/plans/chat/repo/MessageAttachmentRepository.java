package com.plans.chat.repo;

import com.plans.chat.entity.MessageAttachment;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageAttachmentRepository extends JpaRepository<MessageAttachment, UUID> {
    List<MessageAttachment> findByMessageIdIn(Collection<UUID> messageIds);
}
