package com.plans.chat.member;

import java.util.List;
import java.util.UUID;

public record AddParticipantsRequest(List<UUID> userIds) {
}
