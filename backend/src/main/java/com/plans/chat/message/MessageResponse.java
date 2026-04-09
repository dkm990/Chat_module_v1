package com.plans.chat.message;

import com.plans.chat.entity.Message;
import com.plans.chat.entity.MessageType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MessageResponse(
    UUID id,
    UUID chatId,
    UUID senderId,
    MessageType type,
    String bodyJson,
    List<MessageAttachmentResponse> attachments,
    UUID clientGeneratedId,
    Instant createdAt
) {
    public static MessageResponse from(Message message, List<MessageAttachmentResponse> attachments) {
        return new MessageResponse(
            message.getId(),
            message.getChatId(),
            message.getSenderId(),
            message.getType(),
            message.getBodyJson(),
            attachments,
            message.getClientGeneratedId(),
            message.getCreatedAt()
        );
    }
}
