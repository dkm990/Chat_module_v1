import type { ChatApi } from "../api/chatApi";
import {
  buildLocationBody,
  buildMediaBody,
  buildOptimisticMessage,
  buildTextBody,
  mapMessageDtoToVM,
  mapUploadResponseToAttachmentPayload,
  messagePreview,
} from "../mappers/messageMappers";
import type { AttachmentVM, ChatMessageVM, ConversationVM } from "../types/viewModels";

export type MessagePageVM = {
  items: ChatMessageVM[];
  nextCursor: string | null;
};

export const messageAdapter = {
  async loadMessages(api: ChatApi, roomId: string, currentUserId: string, cursor?: string): Promise<MessagePageVM> {
    const page = await api.getMessages(roomId, { cursor, limit: 50 });
    const items = Array.isArray(page.items)
      ? page.items.map((item) => mapMessageDtoToVM(item, currentUserId)).reverse()
      : [];
    const nextCursor =
      page.nextCursorCreatedAt && page.nextCursorId
        ? `${page.nextCursorCreatedAt}|${page.nextCursorId}`
        : null;
    return { items, nextCursor };
  },

  createOptimisticText(input: {
    roomId: string;
    senderId: string;
    text: string;
    clientGeneratedId: string;
  }): ChatMessageVM {
    return buildOptimisticMessage({
      roomId: input.roomId,
      senderId: input.senderId,
      type: "TEXT",
      bodyJson: buildTextBody(input.text),
      clientGeneratedId: input.clientGeneratedId,
    });
  },

  async sendText(api: ChatApi, input: {
    roomId: string;
    senderId: string;
    text: string;
    clientGeneratedId: string;
  }): Promise<ChatMessageVM> {
    const response = await api.sendMessage(input.roomId, {
      type: "TEXT",
      text: input.text,
      bodyJson: buildTextBody(input.text),
      clientGeneratedId: input.clientGeneratedId,
    });
    return mapMessageDtoToVM(response, input.senderId);
  },

  async uploadAttachments(api: ChatApi, files: File[]): Promise<AttachmentVM[]> {
    const uploaded = await Promise.all(files.map((file) => api.uploadAttachment(file)));
    return uploaded.map((item) => ({
      kind: item.mimeType.startsWith("video/") ? "video" : "image",
      storageKey: item.storageKey,
      publicUrl: item.publicUrl,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      width: item.width ?? null,
      height: item.height ?? null,
      durationSec: item.durationSec ?? null,
    }));
  },

  createOptimisticMedia(input: {
    roomId: string;
    senderId: string;
    attachments: AttachmentVM[];
    clientGeneratedId: string;
    text?: string;
  }): ChatMessageVM {
    const first = input.attachments[0];
    return buildOptimisticMessage({
      roomId: input.roomId,
      senderId: input.senderId,
      type: first?.kind === "video" ? "VIDEO" : "IMAGE",
      bodyJson: buildMediaBody(input.text),
      attachments: input.attachments,
      clientGeneratedId: input.clientGeneratedId,
    });
  },

  async sendMedia(api: ChatApi, input: {
    roomId: string;
    senderId: string;
    attachments: AttachmentVM[];
    clientGeneratedId: string;
    text?: string;
  }): Promise<ChatMessageVM> {
    const first = input.attachments[0];
    const response = await api.sendMessage(input.roomId, {
      type: first?.kind === "video" ? "VIDEO" : "IMAGE",
      text: input.text?.trim() || "",
      bodyJson: buildMediaBody(input.text),
      attachments: input.attachments.map((item) =>
        mapUploadResponseToAttachmentPayload({
          storageKey: item.storageKey,
          publicUrl: item.publicUrl,
          mimeType: item.mimeType,
          sizeBytes: item.sizeBytes,
          width: item.width,
          height: item.height,
          durationSec: item.durationSec,
        }),
      ),
      clientGeneratedId: input.clientGeneratedId,
    });
    return mapMessageDtoToVM(response, input.senderId);
  },

  createOptimisticLocation(input: {
    roomId: string;
    senderId: string;
    lat: number;
    lng: number;
    label?: string | null;
    clientGeneratedId: string;
  }): ChatMessageVM {
    return buildOptimisticMessage({
      roomId: input.roomId,
      senderId: input.senderId,
      type: "LOCATION",
      bodyJson: buildLocationBody(input),
      clientGeneratedId: input.clientGeneratedId,
    });
  },

  async sendLocation(api: ChatApi, input: {
    roomId: string;
    senderId: string;
    lat: number;
    lng: number;
    label?: string | null;
    clientGeneratedId: string;
  }): Promise<ChatMessageVM> {
    const response = await api.sendMessage(input.roomId, {
      type: "LOCATION",
      location: {
        lat: input.lat,
        lng: input.lng,
        label: input.label ?? null,
      },
      bodyJson: buildLocationBody(input),
      clientGeneratedId: input.clientGeneratedId,
    });
    return mapMessageDtoToVM(response, input.senderId);
  },

  async markRead(api: ChatApi, roomId: string, lastReadMessageId: string | null): Promise<void> {
    await api.markRead(roomId, lastReadMessageId);
  },

  patchConversationFromMessage(room: ConversationVM | undefined, message: ChatMessageVM): ConversationVM | null {
    if (!room) return null;
    return {
      ...room,
      unreadCount: 0,
      lastMessagePreview: messagePreview(message),
      lastMessageTimestamp: message.createdAt,
    };
  },
};
