export type Room = {
  id: string;
  type: string;
  title?: string;
  roomId?: string;
  roomType?: string;
  displayName?: string;
  counterpartUserId?: string | null;
  counterpartOnline?: boolean;
  counterpartLastSeen?: string | null;
  lastMessagePreview?: string;
  lastMessageTimestamp?: string;
  unreadCount?: number;
};

export type Me = { userId: string; displayName: string };
export type UserSearchItem = { userId: string; displayName: string };
export type InviteUser = { userId: string; displayName?: string | null };

export type Attachment = {
  kind: "IMAGE" | "VIDEO";
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  type: "TEXT" | "IMAGE" | "VIDEO" | "LOCATION" | "SYSTEM";
  bodyJson: string;
  attachments?: Attachment[];
  createdAt: string;
};
