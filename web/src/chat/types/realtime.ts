import type { MessageResponse } from "./api";

export type TypingRealtimeEvent = {
  roomId?: string;
  userId?: string;
  state?: "start" | "stop";
};

export type ReadRealtimeEvent = {
  roomId?: string;
  userId?: string;
  lastReadMessageId?: string | null;
};

export type PresenceRealtimeEvent = {
  userId?: string;
  status?: "online" | "offline";
  lastSeen?: string | null;
};

export type RoomsUpdatedRealtimeEvent = {
  roomId?: string;
};

export type MessageCreatedRealtimeEvent = MessageResponse;
