import type { ChatRoomType, MemberRole } from "./api";

export type AttachmentKindVM = "image" | "video";
export type MessageKindVM = "text" | "image" | "video" | "location" | "system";

export type AttachmentVM = {
  kind: AttachmentKindVM;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
};

export type ParticipantVM = {
  userId: string;
  role: Lowercase<MemberRole>;
  joinedAt: string;
  lastSeenAt: string | null;
};

export type LocationVM = {
  lat: number;
  lng: number;
  label?: string | null;
};

export type SystemBodyVM = {
  code?: string;
  actorId?: string | null;
  targetUserId?: string | null;
};

export type ParsedBodyVM = {
  schemaVersion?: number;
  text?: string;
  format?: "plain";
  location?: LocationVM;
  system?: SystemBodyVM;
};

export type ChatMessageVM = {
  id: string;
  roomId: string;
  senderId: string | null;
  type: MessageKindVM;
  bodyJson: string;
  parsedBody: ParsedBodyVM;
  attachments: AttachmentVM[];
  createdAt: string;
  clientGeneratedId: string | null;
  isOwn: boolean;
  deliveryState?: "pending" | "sent" | "failed";
  optimistic?: boolean;
};

export type ConversationVM = {
  id: string;
  type: ChatRoomType;
  title: string | null;
  displayName: string;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageTimestamp: string | null;
  counterpartUserId: string | null;
  counterpartOnline: boolean;
  counterpartLastSeen: string | null;
};

export type MeVM = {
  userId: string;
  displayName: string;
};

export type UserSearchItemVM = {
  userId: string;
  displayName: string;
};

export type InviteUserVM = {
  userId: string;
  displayName?: string | null;
};
