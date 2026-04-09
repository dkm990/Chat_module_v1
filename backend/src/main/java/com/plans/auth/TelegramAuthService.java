package com.plans.auth;

import com.plans.auth.entity.AuthIdentity;
import com.plans.auth.entity.AuthProvider;
import com.plans.auth.entity.User;
import com.plans.auth.repo.AuthIdentityRepository;
import com.plans.auth.repo.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TelegramAuthService {
    private final AuthIdentityRepository identityRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final String botToken;
    private final long maxAuthAgeSeconds;

    public TelegramAuthService(
        AuthIdentityRepository identityRepository,
        UserRepository userRepository,
        JwtService jwtService,
        @Value("${app.auth.telegram.bot-token:}") String botToken,
        @Value("${app.auth.telegram.max-auth-age-seconds:86400}") long maxAuthAgeSeconds
    ) {
        this.identityRepository = identityRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.botToken = botToken;
        this.maxAuthAgeSeconds = maxAuthAgeSeconds;
    }

    public String authenticate(Map<String, String> payload) {
        validateSignature(payload);
        String providerUserId = payload.get("id");
        AuthIdentity identity = identityRepository.findByProviderAndProviderUserId(AuthProvider.TELEGRAM, providerUserId)
            .orElseGet(() -> {
                User user = new User();
                user.setId(UUID.randomUUID());
                user.setDisplayName(payload.getOrDefault("first_name", "") + " " + payload.getOrDefault("last_name", ""));
                user.setAvatarUrl(payload.get("photo_url"));
                user.setCreatedAt(Instant.now());
                userRepository.save(user);

                AuthIdentity created = new AuthIdentity();
                created.setId(UUID.randomUUID());
                created.setUserId(user.getId());
                created.setProvider(AuthProvider.TELEGRAM);
                created.setProviderUserId(providerUserId);
                created.setTelegramUsername(payload.get("username"));
                created.setCreatedAt(Instant.now());
                return identityRepository.save(created);
            });
        User user = userRepository.findById(identity.getUserId()).orElseThrow();
        return jwtService.issue(user.getId(), user.getDisplayName());
    }

    private void validateSignature(Map<String, String> payload) {
        if (botToken.isBlank()) {
            throw new IllegalStateException("Missing telegram bot token");
        }
        String hash = payload.get("hash");
        if (hash == null) {
            throw new IllegalArgumentException("Missing hash");
        }
        String authDateRaw = payload.get("auth_date");
        if (authDateRaw == null) {
            throw new IllegalArgumentException("Missing auth_date");
        }
        long authDate;
        try {
            authDate = Long.parseLong(authDateRaw);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Invalid auth_date");
        }
        long now = Instant.now().getEpochSecond();
        if (authDate > now + 60 || now - authDate > maxAuthAgeSeconds) {
            throw new IllegalArgumentException("Stale telegram auth payload");
        }
        List<String> data = new ArrayList<>();
        payload.entrySet().stream()
            .filter(e -> !"hash".equals(e.getKey()))
            .sorted(Comparator.comparing(Map.Entry::getKey))
            .forEach(e -> data.add(e.getKey() + "=" + e.getValue()));
        String dataCheckString = String.join("\n", data);

        try {
            byte[] secretKey = MessageDigest.getInstance("SHA-256").digest(botToken.getBytes(StandardCharsets.UTF_8));
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey, "HmacSHA256"));
            String calculated = HexFormat.of().formatHex(mac.doFinal(dataCheckString.getBytes(StandardCharsets.UTF_8)));
            if (!calculated.equalsIgnoreCase(hash)) {
                throw new IllegalArgumentException("Invalid telegram signature");
            }
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid telegram signature", ex);
        }
    }
}
