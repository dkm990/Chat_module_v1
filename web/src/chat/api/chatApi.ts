import type {
  AttachmentUploadResponse,
  CreateRoomRequestDto,
  MeResponse,
  MessagePageResponse,
  MessageResponse,
  ParticipantResponse,
  RoomResponse,
  SendMessageRequestDto,
  UserPublicItemResponse,
  UserSearchItemResponse,
} from "../types/api";

export type ChatApiRuntime = {
  apiBase: string;
  token: string;
};

export type MessageHistoryOptions = {
  cursor?: string;
  limit?: number;
};

export function createChatApi(runtime: ChatApiRuntime) {
  const base = runtime.apiBase.replace(/\/+$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${runtime.token}`,
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(init?.headers || {}),
      },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `Request failed: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  return {
    getMe() {
      return request<MeResponse>("/api/chat/v1/me");
    },
    getRooms() {
      return request<RoomResponse[]>("/api/chat/v1/rooms");
    },
    getRoom(roomId: string) {
      return request<RoomResponse>(`/api/chat/v1/rooms/${roomId}`);
    },
    createRoom(payload: CreateRoomRequestDto) {
      return request<RoomResponse>("/api/chat/v1/rooms", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    getMessages(roomId: string, options?: MessageHistoryOptions) {
      const params = new URLSearchParams();
      if (options?.cursor) params.set("cursor", options.cursor);
      if (typeof options?.limit === "number") params.set("limit", String(options.limit));
      const suffix = params.size ? `?${params.toString()}` : "";
      return request<MessagePageResponse>(`/api/chat/v1/rooms/${roomId}/messages${suffix}`);
    },
    sendMessage(roomId: string, payload: SendMessageRequestDto) {
      return request<MessageResponse>(`/api/chat/v1/rooms/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    markRead(roomId: string, lastReadMessageId: string | null) {
      return request<{ status: string }>(`/api/chat/v1/rooms/${roomId}/read`, {
        method: "POST",
        body: JSON.stringify({ lastReadMessageId }),
      });
    },
    uploadAttachment(file: File) {
      const body = new FormData();
      body.append("file", file);
      return request<AttachmentUploadResponse>("/api/chat/v1/attachments", {
        method: "POST",
        body,
      });
    },
    getParticipants(roomId: string) {
      return request<ParticipantResponse[]>(`/api/chat/v1/rooms/${roomId}/participants`);
    },
    searchUsers(query: string, limit = 10) {
      const params = new URLSearchParams({ q: query, limit: String(limit) });
      return request<UserSearchItemResponse[]>(`/api/chat/v1/users/search?${params.toString()}`);
    },
    getPublicUser(userId: string) {
      return request<UserPublicItemResponse>(`/api/chat/v1/users/${userId}/public`);
    },
  };
}

export type ChatApi = ReturnType<typeof createChatApi>;
