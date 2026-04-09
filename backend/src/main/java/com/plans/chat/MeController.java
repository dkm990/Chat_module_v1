package com.plans.chat;

import com.plans.auth.entity.User;
import com.plans.auth.repo.UserRepository;
import com.plans.chat.security.CurrentUser;
import java.security.Principal;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat/v1")
public class MeController {
    private final CurrentUser currentUser;
    private final UserRepository userRepository;

    public MeController(CurrentUser currentUser, UserRepository userRepository) {
        this.currentUser = currentUser;
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public Map<String, String> me(Principal principal) {
        UUID userId = currentUser.userId(principal);
        User user = userRepository.findById(userId).orElse(null);
        return Map.of(
            "userId", userId.toString(),
            "displayName", user != null && user.getDisplayName() != null ? user.getDisplayName() : ""
        );
    }
}
