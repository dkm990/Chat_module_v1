package com.plans.auth;

import jakarta.validation.constraints.NotBlank;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final GoogleAuthService googleAuthService;
    private final TelegramAuthService telegramAuthService;

    public AuthController(GoogleAuthService googleAuthService, TelegramAuthService telegramAuthService) {
        this.googleAuthService = googleAuthService;
        this.telegramAuthService = telegramAuthService;
    }

    @PostMapping("/google")
    public Map<String, String> google(@RequestBody GoogleRequest request) {
        return Map.of("accessToken", googleAuthService.authenticate(request.idToken()));
    }

    @PostMapping("/telegram")
    public Map<String, String> telegram(@RequestBody Map<String, Object> payload) {
        return Map.of("accessToken", telegramAuthService.authenticate(normalize(payload)));
    }

    @PostMapping("/telegram/login")
    public Map<String, String> telegramLogin(@RequestBody Map<String, Object> payload) {
        return Map.of("accessToken", telegramAuthService.authenticate(normalize(payload)));
    }

    public record GoogleRequest(@NotBlank String idToken) {
    }

    private Map<String, String> normalize(Map<String, Object> payload) {
        Map<String, String> normalized = new LinkedHashMap<>();
        payload.forEach((k, v) -> {
            if (v != null) {
                normalized.put(k, String.valueOf(v));
            }
        });
        return normalized;
    }
}
