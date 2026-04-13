package com.plans.chat.policy;

public enum CapabilityAction {
    SEND_MESSAGE("sendMessage"),
    SEND_ATTACHMENTS("sendAttachments"),
    SEND_LOCATION("sendLocation"),
    INVITE_PARTICIPANTS("inviteParticipants"),
    REMOVE_PARTICIPANTS("removeParticipants"),
    LEAVE_ROOM("leaveRoom");

    private final String value;

    CapabilityAction(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }
}

