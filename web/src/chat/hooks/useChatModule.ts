import { useEffect, useSyncExternalStore } from "react";
import { chatStore } from "../store/chatStore";

type UseChatModuleOptions = {
  apiBase: string;
  token: string;
  userId: string;
};

export function useChatModule(options?: UseChatModuleOptions) {
  const snapshot = useSyncExternalStore(chatStore.subscribe, chatStore.getSnapshot, chatStore.getSnapshot);

  useEffect(() => {
    if (!options) return;
    if (!options.token || !options.userId) {
      chatStore.clearSession();
      return;
    }
    chatStore.configure({
      apiBase: options.apiBase,
      token: options.token,
      userId: options.userId,
    });
    void chatStore.connectRealtime();
    void chatStore.loadRooms();
    return () => {
      chatStore.disconnectRealtime();
    };
  }, [options?.apiBase, options?.token, options?.userId]);

  const activeRoom = snapshot.rooms.find((room) => room.id === snapshot.activeRoomId);
  const messages = snapshot.activeRoomId ? snapshot.messagesByRoom[snapshot.activeRoomId] || [] : [];

  return {
    ...snapshot,
    activeRoom,
    messages,
    unreadBoundaryMessageId: snapshot.activeRoomId
      ? snapshot.unreadBoundaryByRoom[snapshot.activeRoomId] || null
      : null,
    loadRooms: () => chatStore.loadRooms(),
    loadMessages: (roomId: string) => chatStore.loadMessages(roomId),
    loadOlderMessages: (roomId: string, cursor?: string) => chatStore.loadOlderMessages(roomId, cursor),
    setActiveRoom: (roomId: string) => chatStore.setActiveRoom(roomId),
    openDirectConversation: (targetUserId: string) => chatStore.openDirectConversation(targetUserId),
    sendText: (roomId: string, text: string) => chatStore.sendText(roomId, text),
    sendAttachments: (roomId: string, files: File[]) => chatStore.sendAttachments(roomId, files),
    sendLocation: (roomId: string, input: { lat: number; lng: number; label?: string | null }) =>
      chatStore.sendLocation(roomId, input),
    markAsRead: (roomId: string) => chatStore.markAsRead(roomId),
    handleComposerTextChange: (roomId: string, nextText: string) =>
      chatStore.handleComposerTextChange(roomId, nextText),
    searchUsers: (query: string) => chatStore.searchUsers(query),
    clearError: () => chatStore.clearError(),
    clearSession: () => chatStore.clearSession(),
  };
}
