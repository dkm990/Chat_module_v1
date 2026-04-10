import type { ChatApi } from "../api/chatApi";
import { mapRoomDtoToVM } from "../mappers/roomMappers";
import type { ConversationVM } from "../types/viewModels";

export const conversationAdapter = {
  async loadRooms(api: ChatApi): Promise<ConversationVM[]> {
    const rooms = await api.getRooms();
    return rooms
      .map(mapRoomDtoToVM)
      .sort((a, b) => {
        const aTs = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
        const bTs = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
        return bTs - aTs;
      });
  },

  async createDirectConversation(api: ChatApi, targetUserId: string): Promise<ConversationVM> {
    const room = await api.createRoom({
      type: "DIRECT",
      title: "Direct chat",
      targetUserId,
    });
    return mapRoomDtoToVM(room);
  },
};
