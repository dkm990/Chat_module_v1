import type { ConversationVM } from "../types/viewModels";

export type RoomActorRole = "owner" | "admin" | "member";

export type RoomPolicyState = {
  readOnly?: boolean;
  archived?: boolean;
};

export type RoomCapabilityContext = {
  room: ConversationVM | null;
  actorRole?: RoomActorRole;
  state?: RoomPolicyState;
};

export type RoomCapabilities = {
  canSendMessage: boolean;
  canSendAttachments: boolean;
  canSendLocation: boolean;
  canInviteParticipants: boolean;
  canRemoveParticipants: boolean;
  canLeaveRoom: boolean;
  canViewParticipants: boolean;
  canSeePresence: boolean;
  canOpenRelatedEntity: boolean;
  canEditRoomMeta: boolean;
};

const DENY_ALL: RoomCapabilities = {
  canSendMessage: false,
  canSendAttachments: false,
  canSendLocation: false,
  canInviteParticipants: false,
  canRemoveParticipants: false,
  canLeaveRoom: false,
  canViewParticipants: false,
  canSeePresence: false,
  canOpenRelatedEntity: false,
  canEditRoomMeta: false,
};

const BASE_BY_TYPE: Record<string, RoomCapabilities> = {
  DIRECT: {
    canSendMessage: true,
    canSendAttachments: true,
    canSendLocation: true,
    canInviteParticipants: false,
    canRemoveParticipants: false,
    canLeaveRoom: false,
    canViewParticipants: true,
    canSeePresence: true,
    canOpenRelatedEntity: false,
    canEditRoomMeta: false,
  },
  GROUP: {
    canSendMessage: true,
    canSendAttachments: true,
    canSendLocation: true,
    canInviteParticipants: false,
    canRemoveParticipants: false,
    canLeaveRoom: true,
    canViewParticipants: true,
    canSeePresence: false,
    canOpenRelatedEntity: false,
    canEditRoomMeta: false,
  },
  EVENT: {
    canSendMessage: true,
    canSendAttachments: true,
    canSendLocation: true,
    canInviteParticipants: false,
    canRemoveParticipants: false,
    canLeaveRoom: true,
    canViewParticipants: true,
    canSeePresence: false,
    canOpenRelatedEntity: true,
    canEditRoomMeta: false,
  },
  VENUE: {
    canSendMessage: true,
    canSendAttachments: true,
    canSendLocation: true,
    canInviteParticipants: false,
    canRemoveParticipants: false,
    canLeaveRoom: true,
    canViewParticipants: true,
    canSeePresence: false,
    canOpenRelatedEntity: true,
    canEditRoomMeta: false,
  },
};

export function evaluateRoomCapabilities(input: RoomCapabilityContext): RoomCapabilities {
  const room = input.room;
  if (!room) return DENY_ALL;

  const base = { ...(BASE_BY_TYPE[room.type] || BASE_BY_TYPE.GROUP) };
  const actorRole = input.actorRole || "member";
  const isElevated = actorRole === "owner" || actorRole === "admin";

  if (room.type === "GROUP") {
    base.canInviteParticipants = isElevated;
    base.canRemoveParticipants = isElevated;
    base.canEditRoomMeta = isElevated;
  }

  if (input.state?.archived || input.state?.readOnly) {
    base.canSendMessage = false;
    base.canSendAttachments = false;
    base.canSendLocation = false;
  }

  if (!room.counterpartUserId) {
    base.canSeePresence = false;
  }

  if (room.type === "EVENT" && !room.eventId) {
    base.canOpenRelatedEntity = false;
  }

  if (room.type === "VENUE" && !room.venueId) {
    base.canOpenRelatedEntity = false;
  }

  return base;
}
