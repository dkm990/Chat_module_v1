import { conversationAdapter } from "../adapters/conversationAdapter";
import { messageAdapter } from "../adapters/messageAdapter";
import { createRealtimeAdapter, type RealtimeAdapterOptions } from "../adapters/realtimeAdapter";
import { createChatApi, type ChatApi } from "../api/chatApi";
import { mapMessageDtoToVM } from "../mappers/messageMappers";
import { mapUserSearchDtoToVM } from "../mappers/roomMappers";
import type {
  MessageCreatedRealtimeEvent,
  PresenceRealtimeEvent,
  ReadRealtimeEvent,
  TypingRealtimeEvent,
} from "../types/realtime";
import type { ChatMessageVM, ConversationVM } from "../types/viewModels";

type ChatStoreConfig = {
  apiBase: string;
  token: string;
  userId: string;
};

export type ChatStoreState = {
  rooms: ConversationVM[];
  activeRoomId: string;
  messagesByRoom: Record<string, ChatMessageVM[]>;
  unreadBoundaryByRoom: Record<string, string | null>;
  nextCursorByRoom: Record<string, string | null>;
  loadingOlderByRoom: Record<string, boolean>;
  paginationErrorByRoom: Record<string, string | null>;
  typingUsersByRoom: Record<string, string[]>;
  presenceByUser: Record<string, { online: boolean; lastSeen: string | null }>;
  loadingRooms: boolean;
  loadingMessagesByRoom: Record<string, boolean>;
  uploading: boolean;
  errorMessage: string;
  connected: boolean;
};

type Listener = () => void;

const initialState = (): ChatStoreState => ({
  rooms: [],
  activeRoomId: "",
  messagesByRoom: {},
  unreadBoundaryByRoom: {},
  nextCursorByRoom: {},
  loadingOlderByRoom: {},
  paginationErrorByRoom: {},
  typingUsersByRoom: {},
  presenceByUser: {},
  loadingRooms: false,
  loadingMessagesByRoom: {},
  uploading: false,
  errorMessage: "",
  connected: false,
});

class ChatStore {
  private state = initialState();
  private listeners = new Set<Listener>();
  private api: ChatApi | null = null;
  private config: ChatStoreConfig | null = null;
  private realtime = null as ReturnType<typeof createRealtimeAdapter> | null;
  private typingStopTimeout: number | null = null;
  private typingStarted = false;
  private lastTypingStartSentAt = 0;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  configure(config: ChatStoreConfig | null) {
    const changed =
      this.config?.apiBase !== config?.apiBase ||
      this.config?.token !== config?.token ||
      this.config?.userId !== config?.userId;
    if (!changed) return;
    this.disconnectRealtime();
    this.config = config;
    this.api = config ? createChatApi({ apiBase: config.apiBase, token: config.token }) : null;
    this.state = initialState();
    this.emit();
  }

  clearSession() {
    this.disconnectRealtime();
    this.config = null;
    this.api = null;
    this.state = initialState();
    this.emit();
  }

  async connectRealtime() {
    if (!this.config || !this.api || this.realtime) return;
    const options: RealtimeAdapterOptions = {
      apiBase: this.config.apiBase,
      token: this.config.token,
      userId: this.config.userId,
      onConnected: () => this.patch({ connected: true }),
      onDisconnected: () => this.patch({ connected: false }),
      onMessageCreated: (event) => this.handleMessageCreated(event),
      onReadEvent: (event) => this.handleReadEvent(event),
      onTypingEvent: (event) => this.handleTypingEvent(event),
      onRoomsUpdated: async () => {
        await this.loadRooms();
      },
      onPresenceChanged: (event) => this.handlePresenceChanged(event),
    };
    this.realtime = createRealtimeAdapter(options);
    this.realtime.connect();
  }

  disconnectRealtime() {
    if (this.typingStopTimeout) {
      window.clearTimeout(this.typingStopTimeout);
      this.typingStopTimeout = null;
    }
    this.typingStarted = false;
    this.lastTypingStartSentAt = 0;
    this.realtime?.disconnect();
    this.realtime = null;
    this.patch({ connected: false, typingUsersByRoom: {} });
  }

  async loadRooms() {
    if (!this.api) return;
    this.patch({ loadingRooms: true, errorMessage: "" });
    try {
      const rooms = await conversationAdapter.loadRooms(this.api);
      const activeRoomId = this.state.activeRoomId || rooms[0]?.id || "";
      this.patch({
        rooms: rooms.map((room) => (room.id === activeRoomId ? { ...room, unreadCount: 0 } : room)),
        activeRoomId,
        loadingRooms: false,
      });
      this.syncActivePresence();
      if (activeRoomId && !this.state.messagesByRoom[activeRoomId]) {
        await this.loadMessages(activeRoomId);
      }
    } catch (error) {
      this.patch({
        loadingRooms: false,
        errorMessage: toErrorMessage(error, "Failed to load rooms."),
      });
    }
  }

  async loadMessages(roomId: string) {
    if (!this.api || !this.config || !roomId) return;
    this.patchLoadingMessages(roomId, true);
    try {
      const page = await messageAdapter.loadMessages(this.api, roomId, this.config.userId);
      const roomUnread = this.state.rooms.find((room) => room.id === roomId)?.unreadCount || 0;
      const unreadBoundary =
        roomUnread > 0
          ? page.items[Math.max(0, page.items.length - roomUnread)]?.id || page.items[0]?.id || null
          : null;
      this.state.messagesByRoom[roomId] = dedupeMessages(page.items);
      this.state.nextCursorByRoom[roomId] = page.nextCursor;
      this.state.unreadBoundaryByRoom[roomId] = unreadBoundary;
      this.state.paginationErrorByRoom[roomId] = null;
      this.state.rooms = this.state.rooms.map((room) =>
        room.id === roomId ? { ...room, unreadCount: 0 } : room,
      );
      this.state.loadingMessagesByRoom[roomId] = false;
      this.state.errorMessage = "";
      this.emit();
      await this.markAsRead(roomId);
    } catch (error) {
      this.patchLoadingMessages(roomId, false);
      this.patch({ errorMessage: toErrorMessage(error, "Failed to load messages.") });
    }
  }

  async loadOlderMessages(roomId: string, cursor?: string) {
    if (!this.api || !this.config) return;
    const nextCursor = cursor ?? this.state.nextCursorByRoom[roomId];
    if (!nextCursor) return;
    this.state.loadingOlderByRoom[roomId] = true;
    this.state.paginationErrorByRoom[roomId] = null;
    this.emit();
    try {
      const page = await messageAdapter.loadMessages(this.api, roomId, this.config.userId, nextCursor);
      this.state.messagesByRoom[roomId] = dedupeMessages([
        ...page.items,
        ...(this.state.messagesByRoom[roomId] || []),
      ]);
      this.state.nextCursorByRoom[roomId] = page.nextCursor;
      this.state.loadingOlderByRoom[roomId] = false;
      this.emit();
    } catch (error) {
      this.state.loadingOlderByRoom[roomId] = false;
      this.state.paginationErrorByRoom[roomId] = toErrorMessage(error, "Failed to load older messages.");
      this.emit();
    }
  }

  async setActiveRoom(roomId: string) {
    if (!roomId) {
      this.patch({ activeRoomId: "" });
      this.realtime?.setActiveRoom(null);
      this.realtime?.setPresenceTarget(null);
      return;
    }
    this.patch({
      activeRoomId: roomId,
      rooms: this.state.rooms.map((room) => (room.id === roomId ? { ...room, unreadCount: 0 } : room)),
    });
    this.realtime?.setActiveRoom(roomId);
    this.syncActivePresence();
    if (!this.state.messagesByRoom[roomId]) {
      await this.loadMessages(roomId);
    } else {
      await this.markAsRead(roomId);
    }
  }

  async openDirectConversation(targetUserId: string) {
    if (!this.api) return null;
    try {
      const room = await conversationAdapter.createDirectConversation(this.api, targetUserId);
      this.state.rooms = sortRoomsByActivity(upsertRoom(this.state.rooms, { ...room, unreadCount: 0 }));
      this.emit();
      await this.setActiveRoom(room.id);
      await this.loadRooms();
      return room;
    } catch (error) {
      this.patch({ errorMessage: toErrorMessage(error, "Failed to create direct room.") });
      return null;
    }
  }

  async sendText(roomId: string, text: string) {
    if (!this.api || !this.config || !roomId || !text.trim()) return;
    const clientGeneratedId = crypto.randomUUID();
    const optimistic = messageAdapter.createOptimisticText({
      roomId,
      senderId: this.config.userId,
      text: text.trim(),
      clientGeneratedId,
    });
    this.insertOptimisticMessage(roomId, optimistic);
    try {
      const message = await messageAdapter.sendText(this.api, {
        roomId,
        senderId: this.config.userId,
        text: text.trim(),
        clientGeneratedId,
      });
      this.upsertServerMessage(roomId, message);
    } catch (error) {
      this.failOptimisticMessage(roomId, clientGeneratedId);
      this.patch({ errorMessage: toErrorMessage(error, "Failed to send message.") });
    }
  }

  async sendAttachments(roomId: string, files: File[]) {
    if (!this.api || !this.config || !roomId || files.length === 0) return;
    const clientGeneratedId = crypto.randomUUID();
    this.patch({ uploading: true, errorMessage: "" });
    try {
      const attachments = await messageAdapter.uploadAttachments(this.api, files);
      const optimistic = messageAdapter.createOptimisticMedia({
        roomId,
        senderId: this.config.userId,
        attachments,
        clientGeneratedId,
      });
      this.insertOptimisticMessage(roomId, optimistic);
      const message = await messageAdapter.sendMedia(this.api, {
        roomId,
        senderId: this.config.userId,
        attachments,
        clientGeneratedId,
      });
      this.upsertServerMessage(roomId, message);
      this.patch({ uploading: false });
    } catch (error) {
      this.failOptimisticMessage(roomId, clientGeneratedId);
      this.patch({
        uploading: false,
        errorMessage: toErrorMessage(error, "Failed to send media message."),
      });
    }
  }

  async sendLocation(roomId: string, input: { lat: number; lng: number; label?: string | null }) {
    if (!this.api || !this.config || !roomId) return;
    const clientGeneratedId = crypto.randomUUID();
    const optimistic = messageAdapter.createOptimisticLocation({
      roomId,
      senderId: this.config.userId,
      lat: input.lat,
      lng: input.lng,
      label: input.label ?? null,
      clientGeneratedId,
    });
    this.insertOptimisticMessage(roomId, optimistic);
    try {
      const message = await messageAdapter.sendLocation(this.api, {
        roomId,
        senderId: this.config.userId,
        lat: input.lat,
        lng: input.lng,
        label: input.label ?? null,
        clientGeneratedId,
      });
      this.upsertServerMessage(roomId, message);
    } catch (error) {
      this.failOptimisticMessage(roomId, clientGeneratedId);
      this.patch({ errorMessage: toErrorMessage(error, "Failed to send location message.") });
    }
  }

  async markAsRead(roomId: string) {
    if (!this.api || !roomId) return;
    const lastReadMessageId = this.state.messagesByRoom[roomId]?.at(-1)?.id || null;
    if (!lastReadMessageId) return;
    try {
      await messageAdapter.markRead(this.api, roomId, lastReadMessageId);
      this.state.unreadBoundaryByRoom[roomId] = null;
      this.state.rooms = this.state.rooms.map((room) =>
        room.id === roomId ? { ...room, unreadCount: 0 } : room,
      );
      this.emit();
    } catch (error) {
      this.patch({ errorMessage: toErrorMessage(error, "Failed to mark room as read.") });
    }
  }

  handleComposerTextChange(roomId: string, nextText: string) {
    if (!roomId) return;
    const hasText = nextText.trim().length > 0;
    if (!hasText) {
      if (this.typingStopTimeout) {
        window.clearTimeout(this.typingStopTimeout);
        this.typingStopTimeout = null;
      }
      if (this.typingStarted) {
        this.realtime?.publishTyping(roomId, "stop");
        this.typingStarted = false;
      }
      return;
    }
    const now = Date.now();
    if (!this.typingStarted || now - this.lastTypingStartSentAt >= 1000) {
      this.realtime?.publishTyping(roomId, "start");
      this.typingStarted = true;
      this.lastTypingStartSentAt = now;
    }
    if (this.typingStopTimeout) {
      window.clearTimeout(this.typingStopTimeout);
    }
    this.typingStopTimeout = window.setTimeout(() => {
      if (this.typingStarted) {
        this.realtime?.publishTyping(roomId, "stop");
        this.typingStarted = false;
      }
      this.typingStopTimeout = null;
    }, 1500);
  }

  clearError() {
    this.patch({ errorMessage: "" });
  }

  async searchUsers(query: string) {
    if (!this.api || !query.trim()) return [];
    const items = await this.api.searchUsers(query.trim(), 10);
    return items.map(mapUserSearchDtoToVM);
  }

  private handleMessageCreated(event: MessageCreatedRealtimeEvent) {
    if (!this.config) return;
    const message = mapMessageDtoToVM(event, this.config.userId);
    this.upsertServerMessage(message.roomId, message);
  }

  private handleReadEvent(event: ReadRealtimeEvent) {
    if (!event.roomId) return;
    if (event.userId === this.config?.userId) {
      this.state.unreadBoundaryByRoom[event.roomId] = null;
      this.state.rooms = this.state.rooms.map((room) =>
        room.id === event.roomId ? { ...room, unreadCount: 0 } : room,
      );
      this.emit();
    }
  }

  private handleTypingEvent(event: TypingRealtimeEvent) {
    if (!event.roomId || !event.userId || event.userId === this.config?.userId) return;
    const current = new Set(this.state.typingUsersByRoom[event.roomId] || []);
    if (event.state === "start") current.add(event.userId);
    if (event.state === "stop") current.delete(event.userId);
    this.state.typingUsersByRoom[event.roomId] = [...current];
    this.emit();
  }

  private handlePresenceChanged(event: PresenceRealtimeEvent) {
    if (!event.userId) return;
    this.state.presenceByUser[event.userId] = {
      online: event.status === "online",
      lastSeen: event.lastSeen ?? null,
    };
    this.state.rooms = this.state.rooms.map((room) =>
      room.counterpartUserId === event.userId
        ? {
            ...room,
            counterpartOnline: event.status === "online",
            counterpartLastSeen: event.lastSeen ?? room.counterpartLastSeen,
          }
        : room,
    );
    this.emit();
  }

  private syncActivePresence() {
    const activeRoom = this.state.rooms.find((room) => room.id === this.state.activeRoomId);
    this.realtime?.setActiveRoom(this.state.activeRoomId || null);
    this.realtime?.setPresenceTarget(activeRoom?.counterpartUserId || null);
  }

  private insertOptimisticMessage(roomId: string, message: ChatMessageVM) {
    this.state.messagesByRoom[roomId] = dedupeMessages([
      ...(this.state.messagesByRoom[roomId] || []),
      message,
    ]);
    this.patchRoomPreview(roomId, message, true);
    this.emit();
  }

  private upsertServerMessage(roomId: string, message: ChatMessageVM) {
    const current = this.state.messagesByRoom[roomId] || [];
    const filtered = current.filter((item) => {
      if (item.id === message.id) return false;
      if (message.clientGeneratedId && item.clientGeneratedId === message.clientGeneratedId) return false;
      return true;
    });
    this.state.messagesByRoom[roomId] = dedupeMessages([
      ...filtered,
      { ...message, optimistic: false, deliveryState: "sent" },
    ]);
    this.patchRoomPreview(roomId, message, roomId === this.state.activeRoomId);
    if (roomId === this.state.activeRoomId) {
      this.state.unreadBoundaryByRoom[roomId] = null;
    }
    this.emit();
  }

  private failOptimisticMessage(roomId: string, clientGeneratedId: string) {
    this.state.messagesByRoom[roomId] = (this.state.messagesByRoom[roomId] || []).map((item) =>
      item.clientGeneratedId === clientGeneratedId
        ? { ...item, deliveryState: "failed", optimistic: true }
        : item,
    );
    this.emit();
  }

  private patchRoomPreview(roomId: string, message: ChatMessageVM, isActiveRoom: boolean) {
    const existing = this.state.rooms.find((room) => room.id === roomId);
    const fallback: ConversationVM = existing || {
      id: roomId,
      type: "DIRECT",
      title: null,
      displayName: "Chat",
      unreadCount: 0,
      lastMessagePreview: "",
      lastMessageTimestamp: null,
      counterpartUserId: null,
      counterpartOnline: false,
      counterpartLastSeen: null,
    };
    this.state.rooms = sortRoomsByActivity(
      upsertRoom(this.state.rooms, {
        ...fallback,
        unreadCount: isActiveRoom
          ? 0
          : (existing?.unreadCount || 0) + (message.isOwn ? 0 : 1),
        lastMessagePreview: message.parsedBody.text?.trim() || inferPreview(message),
        lastMessageTimestamp: message.createdAt,
      }),
    );
  }

  private patch(next: Partial<ChatStoreState>) {
    this.state = { ...this.state, ...next };
    this.emit();
  }

  private patchLoadingMessages(roomId: string, value: boolean) {
    this.state.loadingMessagesByRoom[roomId] = value;
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

export const chatStore = new ChatStore();

function sortRoomsByActivity(rooms: ConversationVM[]) {
  return [...rooms].sort((a, b) => {
    const aTs = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
    const bTs = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
    return bTs - aTs;
  });
}

function upsertRoom(rooms: ConversationVM[], target: ConversationVM) {
  const without = rooms.filter((room) => room.id !== target.id);
  return [target, ...without];
}

function dedupeMessages(items: ChatMessageVM[]) {
  const byId = new Map<string, ChatMessageVM>();
  const byClientId = new Map<string, ChatMessageVM>();
  for (const item of items) {
    if (byId.has(item.id)) {
      byId.set(item.id, mergeMessages(byId.get(item.id)!, item));
      continue;
    }
    if (item.clientGeneratedId && byClientId.has(item.clientGeneratedId)) {
      const existing = byClientId.get(item.clientGeneratedId)!;
      const merged = mergeMessages(existing, item);
      byClientId.set(item.clientGeneratedId, merged);
      byId.delete(existing.id);
      byId.set(merged.id, merged);
      continue;
    }
    byId.set(item.id, item);
    if (item.clientGeneratedId) byClientId.set(item.clientGeneratedId, item);
  }
  return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function mergeMessages(left: ChatMessageVM, right: ChatMessageVM): ChatMessageVM {
  return {
    ...left,
    ...right,
    attachments: right.attachments.length ? right.attachments : left.attachments,
    parsedBody: Object.keys(right.parsedBody || {}).length ? right.parsedBody : left.parsedBody,
    deliveryState: right.deliveryState || left.deliveryState,
    optimistic: right.optimistic ?? left.optimistic,
  };
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function inferPreview(message: ChatMessageVM) {
  switch (message.type) {
    case "image":
      return "Photo";
    case "video":
      return "Video";
    case "location":
      return "Location";
    case "system":
      return "System update";
    case "text":
    default:
      return "Message";
  }
}
