package com.plans.chat.realtime;

import java.util.UUID;

public record WsReadRequest(UUID roomId, UUID lastReadMessageId) {
}
