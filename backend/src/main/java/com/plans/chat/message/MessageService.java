package com.plans.chat.message;

import com.plans.chat.entity.ChatRoom;
import com.plans.chat.entity.ChatRoomMember;
import com.plans.chat.entity.MessageAttachment;
import com.plans.chat.entity.Message;
import com.plans.chat.entity.MessageType;
import com.plans.chat.entity.MessageReadState;
import com.plans.chat.repo.ChatRoomMemberRepository;
import com.plans.chat.repo.ChatRoomRepository;
import com.plans.chat.repo.MessageAttachmentRepository;
import com.plans.chat.repo.MessageReadStateRepository;
import com.plans.chat.repo.MessageRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessageService {
    private final MessageRepository messageRepository;
    private final ChatRoomRepository roomRepository;
    private final ChatRoomMemberRepository memberRepository;
    private final MessageReadStateRepository readStateRepository;
    private final MessageAttachmentRepository attachmentRepository;
    private final ObjectMapper objectMapper;

    public MessageService(
        MessageRepository messageRepository,
        ChatRoomRepository roomRepository,
        ChatRoomMemberRepository memberRepository,
        MessageReadStateRepository readStateRepository,
        MessageAttachmentRepository attachmentRepository,
        ObjectMapper objectMapper
    ) {
        this.messageRepository = messageRepository;
        this.roomRepository = roomRepository;
        this.memberRepository = memberRepository;
        this.readStateRepository = readStateRepository;
        this.attachmentRepository = attachmentRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public MessageResponse send(UUID roomId, UUID senderId, SendMessageRequest request) {
        ensureActiveMember(roomId, senderId);
        validateRequest(request);
        Message message = new Message();
        message.setId(UUID.randomUUID());
        message.setChatId(roomId);
        message.setSenderId(senderId);
        message.setType(request.type());
        message.setBodyJson(resolveBodyJson(request));
        message.setClientGeneratedId(request.clientGeneratedId());
        message.setCreatedAt(Instant.now());
        messageRepository.save(message);

        List<MessageAttachmentResponse> attachmentResponses = saveAttachments(message.getId(), request);

        ChatRoom room = roomRepository.findById(roomId).orElseThrow();
        room.setLastMessageId(message.getId());
        room.setLastMessageAt(message.getCreatedAt());
        room.setUpdatedAt(Instant.now());
        roomRepository.save(room);
        return MessageResponse.from(message, attachmentResponses);
    }

    private void validateRequest(SendMessageRequest request) {
        if ((request.type() == MessageType.IMAGE || request.type() == MessageType.VIDEO)
            && (request.attachments() == null || request.attachments().isEmpty())) {
            throw new IllegalArgumentException("Media message requires attachments");
        }
        if (request.type() == MessageType.LOCATION && request.location() == null) {
            throw new IllegalArgumentException("Location message requires location payload");
        }
    }

    @Transactional(readOnly = true)
    public MessagePageResponse history(UUID roomId, UUID userId, Instant cursorCreatedAt, UUID cursorId, int limit) {
        ensureActiveMember(roomId, userId);
        List<Message> page = (cursorCreatedAt == null || cursorId == null)
            ? messageRepository.findPageFirst(roomId, PageRequest.of(0, limit))
            : messageRepository.findPage(roomId, cursorCreatedAt, cursorId, PageRequest.of(0, limit));
        Map<UUID, List<MessageAttachmentResponse>> attachments = loadAttachments(page);
        Instant nextTs = null;
        UUID nextId = null;
        if (!page.isEmpty()) {
            Message last = page.get(page.size() - 1);
            nextTs = last.getCreatedAt();
            nextId = last.getId();
        }
        return new MessagePageResponse(
            page.stream()
                .map(m -> MessageResponse.from(m, attachments.getOrDefault(m.getId(), List.of())))
                .toList(),
            nextTs,
            nextId
        );
    }

    @Transactional
    public void markRead(UUID roomId, UUID userId, UUID lastReadMessageId) {
        ensureActiveMember(roomId, userId);
        MessageReadState state = readStateRepository.findByChatIdAndUserId(roomId, userId).orElseGet(() -> {
            MessageReadState s = new MessageReadState();
            s.setChatId(roomId);
            s.setUserId(userId);
            return s;
        });
        state.setLastReadMessageId(lastReadMessageId);
        state.setUpdatedAt(Instant.now());
        readStateRepository.save(state);

        memberRepository.findByChatIdAndUserId(roomId, userId).ifPresent(member -> {
            member.setLastSeenAt(Instant.now());
            memberRepository.save(member);
        });
    }

    @Transactional
    public MessageResponse sendSystem(UUID roomId, String code, UUID actorId, UUID targetUserId) {
        Map<String, Object> body = new HashMap<>();
        Map<String, Object> system = new HashMap<>();
        system.put("code", code);
        system.put("actorId", actorId == null ? null : actorId.toString());
        system.put("targetUserId", targetUserId == null ? null : targetUserId.toString());
        body.put("system", system);
        Message message = new Message();
        message.setId(UUID.randomUUID());
        message.setChatId(roomId);
        message.setSenderId(null);
        message.setType(MessageType.SYSTEM);
        try {
            message.setBodyJson(objectMapper.writeValueAsString(body));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid system payload");
        }
        message.setCreatedAt(Instant.now());
        messageRepository.save(message);

        ChatRoom room = roomRepository.findById(roomId).orElseThrow();
        room.setLastMessageId(message.getId());
        room.setLastMessageAt(message.getCreatedAt());
        room.setUpdatedAt(Instant.now());
        roomRepository.save(room);
        return MessageResponse.from(message, List.of());
    }

    private String resolveBodyJson(SendMessageRequest request) {
        if (request.bodyJson() != null && !request.bodyJson().isBlank()) {
            return request.bodyJson();
        }
        Map<String, Object> body = new HashMap<>();
        if (request.type() == MessageType.TEXT) {
            body.put("text", request.text() == null ? "" : request.text());
        } else if (request.type() == MessageType.LOCATION && request.location() != null) {
            Map<String, Object> location = new HashMap<>();
            location.put("lat", request.location().lat());
            location.put("lng", request.location().lng());
            location.put("label", request.location().label());
            body.put("location", location);
        } else {
            body.put("text", request.text() == null ? "" : request.text());
        }
        try {
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid message body");
        }
    }

    private List<MessageAttachmentResponse> saveAttachments(UUID messageId, SendMessageRequest request) {
        if (request.attachments() == null || request.attachments().isEmpty()) {
            return List.of();
        }
        return request.attachments().stream().map(a -> {
            MessageAttachment entity = new MessageAttachment();
            entity.setId(UUID.randomUUID());
            entity.setMessageId(messageId);
            entity.setKind(a.kind());
            entity.setStorageKey(a.storageKey());
            entity.setPublicUrl(a.publicUrl());
            entity.setMimeType(a.mimeType());
            entity.setSizeBytes(a.sizeBytes());
            entity.setWidth(a.width());
            entity.setHeight(a.height());
            entity.setDurationSec(a.durationSec());
            attachmentRepository.save(entity);
            return new MessageAttachmentResponse(
                entity.getKind(),
                entity.getStorageKey(),
                entity.getPublicUrl(),
                entity.getMimeType(),
                entity.getSizeBytes(),
                entity.getWidth(),
                entity.getHeight(),
                entity.getDurationSec()
            );
        }).toList();
    }

    private Map<UUID, List<MessageAttachmentResponse>> loadAttachments(List<Message> messages) {
        if (messages.isEmpty()) return Collections.emptyMap();
        List<UUID> ids = messages.stream().map(Message::getId).toList();
        Map<UUID, List<MessageAttachmentResponse>> out = new HashMap<>();
        for (MessageAttachment a : attachmentRepository.findByMessageIdIn(ids)) {
            out.computeIfAbsent(a.getMessageId(), k -> new java.util.ArrayList<>())
                .add(new MessageAttachmentResponse(
                    a.getKind(), a.getStorageKey(), a.getPublicUrl(), a.getMimeType(),
                    a.getSizeBytes(), a.getWidth(), a.getHeight(), a.getDurationSec()
                ));
        }
        return out;
    }

    private void ensureActiveMember(UUID roomId, UUID userId) {
        memberRepository.findByChatIdAndUserId(roomId, userId)
            .filter(ChatRoomMember::isActive)
            .orElseThrow(() -> new IllegalStateException("Forbidden"));
    }
}
