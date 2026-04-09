package com.plans.chat;

import com.plans.auth.entity.User;
import com.plans.auth.repo.UserRepository;
import com.plans.chat.security.CurrentUser;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/chat/v1/users")
public class UserSearchController {
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    public UserSearchController(UserRepository userRepository, CurrentUser currentUser) {
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    @GetMapping("/search")
    public List<UserSearchItem> search(
        @RequestParam(name = "q", defaultValue = "") String q,
        @RequestParam(name = "limit", defaultValue = "10") int limit,
        Principal principal
    ) {
        UUID me = currentUser.userId(principal);
        int safeLimit = Math.max(1, Math.min(limit, 20));
        return userRepository.searchUsers(q.trim(), me, PageRequest.of(0, safeLimit)).stream()
            .map(UserSearchItem::from)
            .toList();
    }

    @GetMapping("/{userId}/public")
    public UserPublicItem getPublicById(@PathVariable("userId") UUID userId, Principal principal) {
        currentUser.userId(principal);
        return userRepository.findById(userId)
            .map(UserPublicItem::from)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public record UserSearchItem(String userId, String displayName) {
        static UserSearchItem from(User u) {
            String name = u.getDisplayName() == null || u.getDisplayName().isBlank()
                ? u.getId().toString()
                : u.getDisplayName();
            return new UserSearchItem(u.getId().toString(), name);
        }
    }

    public record UserPublicItem(String userId, String displayName) {
        static UserPublicItem from(User u) {
            String name = u.getDisplayName() == null || u.getDisplayName().isBlank()
                ? u.getId().toString()
                : u.getDisplayName();
            return new UserPublicItem(u.getId().toString(), name);
        }
    }
}
