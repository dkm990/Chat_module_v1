package com.plans.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_room")
public class ChatRoom {
    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    private ChatRoomType type;

    private String title;
    private UUID eventId;
    private UUID venueId;
    private UUID directUserLow;
    private UUID directUserHigh;
    private UUID lastMessageId;
    private Instant lastMessageAt;

    @Column(nullable = false)
    private short typeVersion = 1;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public ChatRoomType getType() { return type; }
    public void setType(ChatRoomType type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public UUID getEventId() { return eventId; }
    public void setEventId(UUID eventId) { this.eventId = eventId; }
    public UUID getVenueId() { return venueId; }
    public void setVenueId(UUID venueId) { this.venueId = venueId; }
    public UUID getDirectUserLow() { return directUserLow; }
    public void setDirectUserLow(UUID directUserLow) { this.directUserLow = directUserLow; }
    public UUID getDirectUserHigh() { return directUserHigh; }
    public void setDirectUserHigh(UUID directUserHigh) { this.directUserHigh = directUserHigh; }
    public UUID getLastMessageId() { return lastMessageId; }
    public void setLastMessageId(UUID lastMessageId) { this.lastMessageId = lastMessageId; }
    public Instant getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; }
    public short getTypeVersion() { return typeVersion; }
    public void setTypeVersion(short typeVersion) { this.typeVersion = typeVersion; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
