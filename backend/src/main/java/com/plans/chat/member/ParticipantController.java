package com.plans.chat.member;

import com.plans.chat.security.CurrentUser;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat/v1/rooms/{roomId}")
public class ParticipantController {
    private final ParticipantService participantService;
    private final CurrentUser currentUser;

    public ParticipantController(ParticipantService participantService, CurrentUser currentUser) {
        this.participantService = participantService;
        this.currentUser = currentUser;
    }

    @GetMapping("/participants")
    public List<ParticipantResponse> participants(@PathVariable UUID roomId) {
        return participantService.activeParticipants(roomId);
    }

    @PostMapping("/participants")
    public List<ParticipantResponse> addParticipants(
        @PathVariable UUID roomId,
        @RequestBody AddParticipantsRequest payload,
        Principal principal
    ) {
        return participantService.addParticipants(roomId, currentUser.userId(principal), payload.userIds());
    }

    @DeleteMapping("/participants/{userId}")
    public List<ParticipantResponse> removeParticipant(@PathVariable UUID roomId, @PathVariable UUID userId, Principal principal) {
        return participantService.removeParticipant(roomId, currentUser.userId(principal), userId);
    }

    @PostMapping("/leave")
    public java.util.Map<String, String> leave(@PathVariable UUID roomId, Principal principal) {
        participantService.leave(roomId, currentUser.userId(principal));
        return java.util.Map.of("status", "ok");
    }
}
