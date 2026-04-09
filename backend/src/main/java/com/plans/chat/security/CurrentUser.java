package com.plans.chat.security;

import java.security.Principal;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
    public UUID userId(Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Unauthenticated");
        }
        return UUID.fromString(principal.getName());
    }
}
