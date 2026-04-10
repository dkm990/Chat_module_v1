import { Client, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type {
  MessageCreatedRealtimeEvent,
  PresenceRealtimeEvent,
  ReadRealtimeEvent,
  RoomsUpdatedRealtimeEvent,
  TypingRealtimeEvent,
} from "../types/realtime";

export type RealtimeAdapterOptions = {
  apiBase: string;
  token: string;
  userId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onMessageCreated: (event: MessageCreatedRealtimeEvent) => void;
  onReadEvent: (event: ReadRealtimeEvent) => void;
  onTypingEvent: (event: TypingRealtimeEvent) => void;
  onRoomsUpdated: (event: RoomsUpdatedRealtimeEvent) => void;
  onPresenceChanged: (event: PresenceRealtimeEvent) => void;
};

export function createRealtimeAdapter(options: RealtimeAdapterOptions) {
  let client: Client | null = null;
  let userSubscriptions: StompSubscription[] = [];
  let roomSubscriptions: StompSubscription[] = [];
  let activeRoomId: string | null = null;
  let activePresenceUserId: string | null = null;

  function connect() {
    if (client?.active || client?.connected) return;
    client = new Client({
      reconnectDelay: 2000,
      webSocketFactory: () => new SockJS(`${options.apiBase.replace(/\/+$/, "")}/ws`),
      connectHeaders: { Authorization: `Bearer ${options.token}` },
      onConnect: () => {
        subscribeUserTopics();
        if (activeRoomId) subscribeRoomTopics(activeRoomId);
        if (activePresenceUserId) subscribePresence(activePresenceUserId);
        options.onConnected?.();
      },
      onDisconnect: () => {
        options.onDisconnected?.();
      },
    });
    client.activate();
  }

  function disconnect() {
    clearSubscriptions(userSubscriptions);
    clearSubscriptions(roomSubscriptions);
    userSubscriptions = [];
    roomSubscriptions = [];
    activeRoomId = null;
    activePresenceUserId = null;
    client?.deactivate();
    client = null;
  }

  function setActiveRoom(roomId: string | null) {
    activeRoomId = roomId;
    clearSubscriptions(roomSubscriptions);
    roomSubscriptions = [];
    if (roomId && client?.connected) subscribeRoomTopics(roomId);
  }

  function setPresenceTarget(userId: string | null) {
    activePresenceUserId = userId;
    clearSubscriptions(roomSubscriptions.filter((item) => item.id.includes("presence")));
    roomSubscriptions = roomSubscriptions.filter((item) => !item.id.includes("presence"));
    if (userId && client?.connected) subscribePresence(userId);
  }

  function publishTyping(roomId: string, state: "start" | "stop") {
    if (!client?.connected) return;
    client.publish({
      destination: "/app/chat.typing",
      body: JSON.stringify({ roomId, state }),
    });
  }

  function subscribeUserTopics() {
    if (!client) return;
    userSubscriptions.push(
      client.subscribe(`/topic/user.${options.userId}.rooms.updated`, (frame) => {
        options.onRoomsUpdated(JSON.parse(frame.body || "{}"));
      }),
    );
  }

  function subscribeRoomTopics(roomId: string) {
    if (!client) return;
    roomSubscriptions.push(
      client.subscribe(`/topic/rooms.${roomId}.messages.created`, (frame) => {
        options.onMessageCreated(JSON.parse(frame.body || "{}"));
      }),
    );
    roomSubscriptions.push(
      client.subscribe(`/topic/rooms.${roomId}.messages.read`, (frame) => {
        options.onReadEvent(JSON.parse(frame.body || "{}"));
      }),
    );
    roomSubscriptions.push(
      client.subscribe(`/topic/rooms.${roomId}.typing`, (frame) => {
        options.onTypingEvent(JSON.parse(frame.body || "{}"));
      }),
    );
  }

  function subscribePresence(userId: string) {
    if (!client) return;
    roomSubscriptions.push(
      client.subscribe(`/topic/user.${userId}.presence.changed`, (frame) => {
        options.onPresenceChanged(JSON.parse(frame.body || "{}"));
      }),
    );
  }

  return {
    connect,
    disconnect,
    setActiveRoom,
    setPresenceTarget,
    publishTyping,
    isConnected: () => !!client?.connected,
  };
}

function clearSubscriptions(items: StompSubscription[]) {
  for (const item of items) {
    try {
      item.unsubscribe();
    } catch {
      // noop
    }
  }
}
