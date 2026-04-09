package com.plans.chat.realtime;

import com.plans.chat.entity.MessageType;
import java.util.UUID;

public record WsSendMessageRequest(
    UUID roomId,
    MessageType type,
    String bodyJson,
    UUID clientGeneratedId
) {
}
