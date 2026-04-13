export type ChatRoomType = "DIRECT" | "GROUP" | "EVENT" | "VENUE";
export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "LOCATION" | "SYSTEM";
export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export type RoomResponse = {
  id: string;
  type: ChatRoomType;
  title: string | null;
  eventId: string | null;
  venueId: string | null;
  lastMessageId: string | null;
  lastMessageAt: string | null;
  typeVersion: number;
  unreadCount: number;
  displayName: string;
  counterpartUserId: string | null;
  counterpartOnline: boolean;
  counterpartLastSeen: string | null;
  lastMessagePreview: string | null;
  lastMessageTimestamp: string | null;
};

export type MessageAttachmentDto = {
  kind: "IMAGE" | "VIDEO";
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
};

export type MessageResponse = {
  id: string;
  chatId: string;
  senderId: string | null;
  type: MessageType;
  bodyJson: string;
  attachments: MessageAttachmentDto[];
  clientGeneratedId: string | null;
  createdAt: string;
};

export type MessagePageResponse = {
  items: MessageResponse[];
  nextCursorCreatedAt: string | null;
  nextCursorId: string | null;
};

export type ParticipantResponse = {
  userId: string;
  role: MemberRole;
  joinedAt: string;
  lastSeenAt: string | null;
};

export type MeResponse = {
  userId: string;
  displayName: string;
};

export type UserSearchItemResponse = {
  userId: string;
  displayName: string;
};

export type UserPublicItemResponse = {
  userId: string;
  displayName: string;
};

export type AttachmentUploadResponse = {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
};

export type AttachmentPayloadDto = {
  kind: "IMAGE" | "VIDEO";
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
};

export type LocationPayloadDto = {
  lat: number;
  lng: number;
  label?: string | null;
};

export type SendMessageRequestDto = {
  type: MessageType;
  bodyJson?: string;
  text?: string;
  location?: LocationPayloadDto;
  attachments?: AttachmentPayloadDto[];
  clientGeneratedId?: string;
};

export type CreateRoomRequestDto = {
  targetUserId?: string;
  title?: string;
  type?: ChatRoomType;
};
