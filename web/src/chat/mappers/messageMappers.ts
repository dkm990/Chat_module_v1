import type {
  AttachmentPayloadDto,
  AttachmentUploadResponse,
  MessageAttachmentDto,
  MessageResponse,
} from "../types/api";
import type {
  AttachmentVM,
  ChatMessageVM,
  MessageKindVM,
  ParsedBodyVM,
} from "../types/viewModels";

type JsonRecord = Record<string, unknown>;

export function safeParseBody(bodyJson: string): ParsedBodyVM {
  if (!bodyJson || !bodyJson.trim()) return {};
  try {
    const parsed = JSON.parse(bodyJson) as JsonRecord | null;
    if (!parsed || typeof parsed !== "object") return {};
    const location = asRecord(parsed.location);
    const system = asRecord(parsed.system);
    return {
      schemaVersion: typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : undefined,
      text: typeof parsed.text === "string" ? parsed.text : undefined,
      format: parsed.format === "plain" ? "plain" : undefined,
      location: location
        ? {
            lat: typeof location.lat === "number" ? location.lat : Number(location.lat),
            lng: typeof location.lng === "number" ? location.lng : Number(location.lng),
            label: typeof location.label === "string" ? location.label : null,
          }
        : undefined,
      system: system
        ? {
            code: typeof system.code === "string" ? system.code : undefined,
            actorId: typeof system.actorId === "string" ? system.actorId : null,
            targetUserId: typeof system.targetUserId === "string" ? system.targetUserId : null,
          }
        : undefined,
    };
  } catch {
    return { text: bodyJson };
  }
}

export function buildTextBody(text: string): string {
  return JSON.stringify({
    schemaVersion: 1,
    text,
    format: "plain",
  });
}

export function buildLocationBody(input: { lat: number; lng: number; label?: string | null; text?: string }): string {
  return JSON.stringify({
    schemaVersion: 1,
    text: input.text,
    location: {
      lat: input.lat,
      lng: input.lng,
      label: input.label ?? null,
    },
  });
}

export function buildSystemBody(input: {
  text: string;
  code?: string;
  actorId?: string | null;
  targetUserId?: string | null;
}): string {
  return JSON.stringify({
    schemaVersion: 1,
    text: input.text,
    system: {
      code: input.code,
      actorId: input.actorId ?? null,
      targetUserId: input.targetUserId ?? null,
    },
  });
}

export function buildMediaBody(text?: string): string {
  return JSON.stringify({
    schemaVersion: 1,
    text: text?.trim() ? text.trim() : undefined,
  });
}

export function mapAttachmentDtoToVM(dto: MessageAttachmentDto | AttachmentUploadResponse): AttachmentVM {
  return {
    kind: dto.kind.toLowerCase() as AttachmentVM["kind"],
    storageKey: dto.storageKey,
    publicUrl: dto.publicUrl,
    mimeType: dto.mimeType,
    sizeBytes: dto.sizeBytes,
    width: dto.width ?? null,
    height: dto.height ?? null,
    durationSec: dto.durationSec ?? null,
  };
}

export function mapUploadResponseToAttachmentPayload(dto: AttachmentUploadResponse): AttachmentPayloadDto {
  return {
    kind: dto.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE",
    storageKey: dto.storageKey,
    mimeType: dto.mimeType,
    sizeBytes: dto.sizeBytes,
    width: dto.width ?? null,
    height: dto.height ?? null,
    durationSec: dto.durationSec ?? null,
  };
}

export function mapMessageTypeToVM(type: MessageResponse["type"]): MessageKindVM {
  switch (type) {
    case "IMAGE":
      return "image";
    case "VIDEO":
      return "video";
    case "LOCATION":
      return "location";
    case "SYSTEM":
      return "system";
    case "TEXT":
    default:
      return "text";
  }
}

export function mapMessageDtoToVM(dto: MessageResponse, currentUserId: string): ChatMessageVM {
  return {
    id: dto.id,
    roomId: dto.chatId,
    senderId: dto.senderId,
    type: mapMessageTypeToVM(dto.type),
    bodyJson: dto.bodyJson,
    parsedBody: safeParseBody(dto.bodyJson),
    attachments: (dto.attachments ?? []).map(mapAttachmentDtoToVM),
    createdAt: dto.createdAt,
    clientGeneratedId: dto.clientGeneratedId,
    isOwn: dto.senderId === currentUserId,
    deliveryState: "sent",
  };
}

export function buildOptimisticMessage(input: {
  roomId: string;
  senderId: string;
  type: MessageResponse["type"];
  bodyJson: string;
  attachments?: AttachmentVM[];
  clientGeneratedId: string;
}): ChatMessageVM {
  const id = `optimistic:${input.clientGeneratedId}`;
  return {
    id,
    roomId: input.roomId,
    senderId: input.senderId,
    type: mapMessageTypeToVM(input.type),
    bodyJson: input.bodyJson,
    parsedBody: safeParseBody(input.bodyJson),
    attachments: input.attachments ?? [],
    createdAt: new Date().toISOString(),
    clientGeneratedId: input.clientGeneratedId,
    isOwn: true,
    optimistic: true,
    deliveryState: "pending",
  };
}

export function messagePreview(message: Pick<ChatMessageVM, "type" | "parsedBody" | "attachments">): string {
  switch (message.type) {
    case "image":
      return "Photo";
    case "video":
      return "Video";
    case "location":
      return "Location";
    case "system":
      return message.parsedBody.text?.trim() || "System update";
    case "text":
    default:
      if (message.parsedBody.text?.trim()) return message.parsedBody.text.trim();
      if (message.attachments.length > 0) return message.attachments[0].kind === "video" ? "Video" : "Photo";
      return "Message";
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" ? (value as JsonRecord) : null;
}
