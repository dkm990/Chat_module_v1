package com.plans.chat.message;

public record LocationPayload(
    double lat,
    double lng,
    String label
) {
}
