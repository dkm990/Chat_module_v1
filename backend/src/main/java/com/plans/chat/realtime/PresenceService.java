package com.plans.chat.realtime;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Service;

@Service
public class PresenceService {
    private final Map<UUID, AtomicInteger> activeSessions = new ConcurrentHashMap<>();
    private final Map<UUID, Instant> lastSeen = new ConcurrentHashMap<>();

    public boolean markOnline(UUID userId) {
        AtomicInteger counter = activeSessions.computeIfAbsent(userId, k -> new AtomicInteger(0));
        return counter.incrementAndGet() == 1;
    }

    public boolean markOffline(UUID userId) {
        AtomicInteger counter = activeSessions.get(userId);
        if (counter == null) return false;
        int value = counter.decrementAndGet();
        if (value <= 0) {
            activeSessions.remove(userId);
            lastSeen.put(userId, Instant.now());
            return true;
        }
        return false;
    }

    public boolean isOnline(UUID userId) {
        AtomicInteger counter = activeSessions.get(userId);
        return counter != null && counter.get() > 0;
    }

    public Instant lastSeen(UUID userId) {
        return lastSeen.get(userId);
    }
}
