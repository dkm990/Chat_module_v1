package com.plans.chat.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "message_attachment")
public class MessageAttachment {
    @Id
    private UUID id;
    private UUID messageId;

    @Enumerated(EnumType.STRING)
    private AttachmentKind kind;

    private String storageKey;
    private String publicUrl;
    private String mimeType;
    private long sizeBytes;
    private Integer width;
    private Integer height;
    private Integer durationSec;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getMessageId() { return messageId; }
    public void setMessageId(UUID messageId) { this.messageId = messageId; }
    public AttachmentKind getKind() { return kind; }
    public void setKind(AttachmentKind kind) { this.kind = kind; }
    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }
    public String getPublicUrl() { return publicUrl; }
    public void setPublicUrl(String publicUrl) { this.publicUrl = publicUrl; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(long sizeBytes) { this.sizeBytes = sizeBytes; }
    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }
    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }
    public Integer getDurationSec() { return durationSec; }
    public void setDurationSec(Integer durationSec) { this.durationSec = durationSec; }
}
