import type { ChatApi } from "../api/chatApi";
import { mapParticipantDtoToVM } from "../mappers/roomMappers";
import type { ParticipantVM } from "../types/viewModels";

export const participantAdapter = {
  async loadParticipants(api: ChatApi, roomId: string): Promise<ParticipantVM[]> {
    const items = await api.getParticipants(roomId);
    return items.map(mapParticipantDtoToVM);
  },
  async addParticipants(api: ChatApi, roomId: string, userIds: string[]): Promise<ParticipantVM[]> {
    const items = await api.addParticipants(roomId, userIds);
    return items.map(mapParticipantDtoToVM);
  },
  async removeParticipant(api: ChatApi, roomId: string, userId: string): Promise<ParticipantVM[]> {
    const items = await api.removeParticipant(roomId, userId);
    return items.map(mapParticipantDtoToVM);
  },
  async leaveRoom(api: ChatApi, roomId: string): Promise<void> {
    await api.leaveRoom(roomId);
  },
};

