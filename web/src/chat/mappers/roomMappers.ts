import type { RoomResponse, ParticipantResponse, UserSearchItemResponse, MeResponse } from "../types/api";
import type { ConversationVM, MeVM, ParticipantVM, UserSearchItemVM } from "../types/viewModels";

export function mapRoomDtoToVM(dto: RoomResponse): ConversationVM {
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    eventId: dto.eventId,
    venueId: dto.venueId,
    displayName: dto.displayName || dto.title || "Chat",
    unreadCount: dto.unreadCount ?? 0,
    lastMessagePreview: dto.lastMessagePreview || "",
    lastMessageTimestamp: dto.lastMessageTimestamp || dto.lastMessageAt,
    counterpartUserId: dto.counterpartUserId,
    counterpartOnline: dto.counterpartOnline,
    counterpartLastSeen: dto.counterpartLastSeen,
  };
}

export function mapParticipantDtoToVM(dto: ParticipantResponse): ParticipantVM {
  return {
    userId: dto.userId,
    role: dto.role.toLowerCase() as ParticipantVM["role"],
    joinedAt: dto.joinedAt,
    lastSeenAt: dto.lastSeenAt,
  };
}

export function mapMeDtoToVM(dto: MeResponse): MeVM {
  return {
    userId: dto.userId,
    displayName: dto.displayName,
  };
}

export function mapUserSearchDtoToVM(dto: UserSearchItemResponse): UserSearchItemVM {
  return {
    userId: dto.userId,
    displayName: dto.displayName,
  };
}
