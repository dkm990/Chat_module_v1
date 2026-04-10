import type { MessageModel } from "@chatscope/chat-ui-kit-react";
import type { ChatMessageVM, ConversationVM } from "../types/viewModels";

export type ChatscopeConversationModel = {
  name: string;
  info: string;
  unreadCnt: number;
  unreadDot: boolean;
  lastActivityTime: string;
  active: boolean;
};

export type TimelineEntry =
  | { kind: "date"; key: string; label: string }
  | { kind: "unread"; key: string; label: string }
  | {
      kind: "message";
      key: string;
      message: ChatMessageVM;
      groupStart: boolean;
      groupEnd: boolean;
      model: MessageModel;
    };

export function mapConversationToChatscope(
  conversation: ConversationVM,
  options?: { active?: boolean },
): ChatscopeConversationModel {
  return {
    name: conversation.displayName || conversation.title || "Conversation",
    info: conversation.lastMessagePreview || "No messages yet",
    unreadCnt: conversation.unreadCount,
    unreadDot: conversation.unreadCount > 0,
    lastActivityTime: formatConversationTimestamp(conversation.lastMessageTimestamp),
    active: !!options?.active,
  };
}

export function buildTimelineEntries(
  messages: ChatMessageVM[],
  unreadBoundaryMessageId?: string | null,
): TimelineEntry[] {
  const result: TimelineEntry[] = [];

  for (let index = 0; index < messages.length; index += 1) {
    const current = messages[index];
    const prev = index > 0 ? messages[index - 1] : null;
    const next = index < messages.length - 1 ? messages[index + 1] : null;

    if (!prev || !isSameDay(prev.createdAt, current.createdAt)) {
      result.push({ kind: "date", key: `date-${current.id}`, label: formatDateSeparator(current.createdAt) });
    }

    if (unreadBoundaryMessageId && unreadBoundaryMessageId === current.id) {
      result.push({ kind: "unread", key: `unread-${current.id}`, label: "Unread messages" });
    }

    const groupedWithPrev =
      !!prev &&
      isGroupableMessage(prev) &&
      isGroupableMessage(current) &&
      prev.senderId === current.senderId &&
      Math.abs(new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 7 * 60 * 1000;

    const groupedWithNext =
      !!next &&
      isGroupableMessage(next) &&
      isGroupableMessage(current) &&
      next.senderId === current.senderId &&
      Math.abs(new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()) < 7 * 60 * 1000;

    const groupStart = !groupedWithPrev;
    const groupEnd = !groupedWithNext;

    result.push({
      kind: "message",
      key: current.id,
      message: current,
      groupStart,
      groupEnd,
      model: mapMessageToChatscope(current, { groupStart, groupEnd }),
    });
  }

  return result;
}

export function mapMessageToChatscope(
  message: ChatMessageVM,
  grouping: { groupStart: boolean; groupEnd: boolean },
): MessageModel {
  return {
    message: message.parsedBody.text || "",
    sentTime: formatMessageTimestamp(message.createdAt),
    sender: message.senderId || undefined,
    direction: message.isOwn ? "outgoing" : "incoming",
    position: toPosition(grouping.groupStart, grouping.groupEnd),
    type: "custom",
    payload: message,
  };
}

export function formatPresenceText(counterpartOnline: boolean, counterpartLastSeen?: string | null) {
  if (counterpartOnline) return "online";
  if (!counterpartLastSeen) return "offline";
  const deltaSec = Math.max(0, Math.floor((Date.now() - new Date(counterpartLastSeen).getTime()) / 1000));
  if (deltaSec < 60) return "last seen just now";
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return `last seen ${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `last seen ${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `last seen ${days}d ago`;
}

function toPosition(groupStart: boolean, groupEnd: boolean): MessageModel["position"] {
  if (groupStart && groupEnd) return "single";
  if (groupStart) return "first";
  if (groupEnd) return "last";
  return "normal";
}

function isGroupableMessage(message: ChatMessageVM) {
  if (message.type === "system" || message.type === "location") return false;
  if (message.type === "image" || message.type === "video") return false;
  if (message.attachments.length > 0) return false;
  return true;
}

function isSameDay(leftIso: string, rightIso: string) {
  const left = new Date(leftIso);
  const right = new Date(rightIso);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDateSeparator(iso: string) {
  const now = new Date();
  const dt = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msgDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.floor((today - msgDay) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return dt.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function formatMessageTimestamp(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatConversationTimestamp(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
