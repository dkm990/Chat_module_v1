import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject, ReactNode, RefObject } from "react";
import { useLayoutEffect } from "react";
import type { Message, Room } from "../chatTypes";
import { ChatHeader } from "./ChatHeader";
import { MessageComposer } from "./MessageComposer";

type ChatCanvasProps = {
  apiBase: string;
  currentUserId?: string;
  roomId: string;
  activeRoom?: Room;
  isPeerTyping: boolean;
  presenceText: string;
  loading: boolean;
  errorMessage?: string;
  messages: Message[];
  unreadBoundaryMessageId?: string | null;
  parseBody: (bodyJson: string) => any;
  messageListRef: RefObject<HTMLDivElement | null>;
  onMessagesScroll: () => void;
  text: string;
  onTextChange: (next: string) => void;
  onComposerKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  disabled: boolean;
  uploading: boolean;
  onFilePick: (file: File) => void;
  onSendLocation: () => void;
  /** Narrow mobile layout: header shows ← Back */
  isMobileLayout?: boolean;
  onBackToList?: () => void;
  /** Pixels hidden below layout by virtual keyboard (Visual Viewport) */
  keyboardBottomInset?: number;
  /** Keep timeline scrolled end when composer is focused (mobile keyboard) */
  onComposerFocusScroll?: () => void;
  /** When false, keyboard inset does not auto-scroll timeline (user scrolled up) */
  stickToBottomRef?: MutableRefObject<boolean>;
  hasOlderMessages?: boolean;
  loadingOlder?: boolean;
  loadOlderError?: string | null;
  onLoadOlder?: () => void;
  composer?: ReactNode;
};

export function ChatCanvas(props: ChatCanvasProps) {
  const {
    apiBase,
    currentUserId,
    roomId,
    activeRoom,
    isPeerTyping,
    presenceText,
    loading,
    errorMessage,
    messages,
    unreadBoundaryMessageId,
    parseBody,
    messageListRef,
    onMessagesScroll,
    text,
    onTextChange,
    onComposerKeyDown,
    onSend,
    disabled,
    uploading,
    onFilePick,
    onSendLocation,
    isMobileLayout,
    onBackToList,
    keyboardBottomInset = 0,
    onComposerFocusScroll,
    stickToBottomRef,
    hasOlderMessages,
    loadingOlder,
    loadOlderError,
    onLoadOlder,
    composer,
  } = props;
  const roomTitle = activeRoom?.displayName || activeRoom?.title || "Conversation";

  useLayoutEffect(() => {
    if (!isMobileLayout || !roomId.trim()) return;
    if (keyboardBottomInset <= 0) return;
    if (!stickToBottomRef?.current) return;
    const list = messageListRef.current;
    if (!list) return;
    requestAnimationFrame(() => {
      list.scrollTop = list.scrollHeight;
    });
  }, [isMobileLayout, roomId, keyboardBottomInset, stickToBottomRef, messageListRef]);

  return (
    <section
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        flex: 1,
        boxSizing: "border-box",
        paddingBottom: isMobileLayout ? keyboardBottomInset : 0,
        background:
          "radial-gradient(circle at 85% 15%, rgba(132,85,239,0.09), transparent 32%), radial-gradient(circle at 10% 80%, rgba(94,44,145,0.08), transparent 36%), transparent",
      }}
    >
      <ChatHeader
        activeRoom={activeRoom}
        isPeerTyping={isPeerTyping}
        presenceText={presenceText}
        mobileSelectedRoomId={isMobileLayout ? roomId : undefined}
        onMobileBackToList={isMobileLayout ? onBackToList : undefined}
      />

      <div
        ref={messageListRef}
        onScroll={onMessagesScroll}
        style={{
          overflow: "auto",
          minHeight: 0,
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          scrollPaddingBottom: isMobileLayout ? 12 : 0,
          padding: isMobileLayout ? "12px 14px 16px" : "18px 20px 24px",
        }}
      >
        {roomId && (hasOlderMessages || loadingOlder || loadOlderError) ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            {loadOlderError ? (
              <button
                type="button"
                onClick={onLoadOlder}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#ffd5de",
                  padding: "6px 10px",
                  borderRadius: 9999,
                  border: "1px solid rgba(255,164,184,0.3)",
                  background: "rgba(255,130,160,0.12)",
                  cursor: "pointer",
                }}
              >
                Retry loading earlier messages
              </button>
            ) : loadingOlder ? (
              <div style={{ fontSize: 12, opacity: 0.72 }}>Loading earlier messages…</div>
            ) : hasOlderMessages ? (
              <button
                type="button"
                onClick={onLoadOlder}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#e7e2ff",
                  padding: "6px 10px",
                  borderRadius: 9999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                }}
              >
                Load earlier messages
              </button>
            ) : null}
          </div>
        ) : null}
        {!roomId ? <div style={{ opacity: 0.72, fontSize: 14, textAlign: "center", marginTop: 20 }}>Select a room to view messages.</div> : null}
        {errorMessage ? (
          <div style={{ maxWidth: 520, margin: "0 auto 12px", fontSize: 12, color: "#ffb8c5", border: "1px solid rgba(255,130,160,0.25)", background: "rgba(255,130,160,0.1)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
            {errorMessage}
          </div>
        ) : null}
        {roomId && loading ? (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={`msg-skeleton-${idx}`} style={{ display: "flex", justifyContent: idx % 2 ? "flex-end" : "flex-start" }}>
                <div style={{ width: idx % 2 ? "40%" : "52%", height: 42, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.07), rgba(255,255,255,0.03))" }} />
              </div>
            ))}
          </div>
        ) : null}
        {roomId && !loading && messages.length === 0 ? (
          <div
            style={{
              marginTop: 40,
              marginInline: "auto",
              maxWidth: 440,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
              padding: "22px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>💬</div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>No messages yet</div>
            <div style={{ opacity: 0.74, fontSize: 13, marginTop: 6 }}>Start a conversation with {roomTitle}.</div>
          </div>
        ) : null}
        {!loading ? buildTimeline(messages).map((entry) => {
          if (entry.kind === "separator") {
            return (
              <div key={entry.key} style={{ display: "flex", justifyContent: "center", margin: "14px 0 12px" }}>
                <div style={{ fontSize: 11, opacity: 0.72, padding: "4px 10px", borderRadius: 9999, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
                  {entry.label}
                </div>
              </div>
            );
          }
          const m = entry.message;
          const showUnreadDivider = unreadBoundaryMessageId && unreadBoundaryMessageId === m.id;
          const mine = m.senderId === currentUserId;
          const body = parseBody(m.bodyJson);
          const hasText = !!String(body?.text || "").trim();
          const location = body?.location;
          const hasLocation = m.type === "LOCATION" || (!!location?.lat && !!location?.lng);
          const bubbleRadius = mine
            ? entry.groupEnd ? "16px 16px 6px 16px" : "16px 16px 16px 16px"
            : entry.groupEnd ? "16px 16px 16px 6px" : "16px 16px 16px 16px";
          const messageTs = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const isSystem = m.type === "SYSTEM";
          return (
            <div key={m.id}>
              {showUnreadDivider ? (
                <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#ffcad4", padding: "4px 10px", borderRadius: 9999, border: "1px solid rgba(255,164,184,0.35)", background: "rgba(255,130,160,0.12)" }}>
                    Unread messages
                  </div>
                </div>
              ) : null}
              <div style={{ marginBottom: entry.groupEnd ? 12 : 4, display: "flex", justifyContent: isSystem ? "center" : mine ? "flex-end" : "flex-start" }}>
                <div style={{ width: "min(100%, 640px)", display: "grid", justifyItems: mine ? "end" : "start" }}>
                {!isSystem && !mine && entry.groupStart ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, background: "linear-gradient(135deg, rgba(132,85,239,0.45), rgba(94,44,145,0.35))", border: "1px solid rgba(255,255,255,0.14)" }}>
                      {roomTitle.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.76 }}>{roomTitle}</div>
                  </div>
                ) : null}
                {isSystem ? (
                  <div style={{ maxWidth: "76%", fontSize: 12, opacity: 0.9, border: "1px solid rgba(255,255,255,0.14)", background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))", borderRadius: 9999, padding: "6px 12px", textAlign: "center", boxShadow: "0 8px 16px rgba(0,0,0,0.18)" }}>
                    {hasText ? body?.text : "System update"}
                  </div>
                ) : hasLocation ? (
                  <div style={{ maxWidth: "72%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", background: mine ? "linear-gradient(180deg, rgba(186,158,255,0.24), rgba(132,85,239,0.18))" : "rgba(255,255,255,0.06)", overflow: "hidden", boxShadow: "0 10px 24px rgba(0,0,0,0.18)" }}>
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>Shared location</div>
                      <div style={{ fontSize: 12, opacity: 0.82, marginTop: 2 }}>
                        {Number(location?.lat).toFixed(5)}, {Number(location?.lng).toFixed(5)}
                      </div>
                    </div>
                    <div style={{ padding: "10px 12px", background: "linear-gradient(135deg, rgba(61,75,110,0.5), rgba(23,31,51,0.5))", minHeight: 62, display: "grid", alignContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 11, opacity: 0.75 }}>Map preview placeholder</div>
                      <button style={{ justifySelf: "start", border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.08)", color: "#fff", borderRadius: 8, padding: "6px 9px", fontSize: 11, fontWeight: 700 }}>
                        Open in maps
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      maxWidth: "72%",
                      padding: "10px 12px",
                      borderRadius: bubbleRadius,
                      background: mine ? "linear-gradient(135deg, rgba(186,158,255,0.34), rgba(132,85,239,0.3))" : "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      transition: "transform 100ms ease, box-shadow 120ms ease",
                    }}
                  >
                    {hasText ? <div style={{ fontSize: 14, lineHeight: 1.45 }}>{body?.text}</div> : null}
                    {(m.attachments || []).map((a, idx) => (
                      <div key={`${m.id}-${idx}`} style={{ marginTop: hasText || idx > 0 ? 8 : 0 }}>
                        {a.kind === "IMAGE" ? (
                          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(10,12,18,0.45)" }}>
                            <img src={`${apiBase}${a.publicUrl}`} alt="uploaded" style={{ display: "block", width: "100%", maxWidth: 300, objectFit: "cover" }} />
                          </div>
                        ) : (
                          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(10,12,18,0.45)" }}>
                            <video src={`${apiBase}${a.publicUrl}`} controls style={{ display: "block", width: "100%", maxWidth: 320 }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {entry.groupEnd ? <div style={{ fontSize: 10, opacity: 0.56, marginTop: 3 }}>{messageTs}</div> : null}
                </div>
              </div>
            </div>
          );
        }) : null}
        {roomId && isPeerTyping ? (
          <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 6 }}>
            <div style={{ maxWidth: "72%", padding: "8px 12px", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, opacity: 0.92, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{roomTitle} is typing</span>
              <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
                <Dot delay="0s" />
                <Dot delay="0.2s" />
                <Dot delay="0.4s" />
              </span>
            </div>
          </div>
        ) : null}
        <style>{`
          @keyframes typingDotPulse {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
            40% { transform: translateY(-2px); opacity: 1; }
          }
        `}</style>
      </div>

      {roomId ? (composer ?? (
        <MessageComposer
          text={text}
          onTextChange={onTextChange}
          onKeyDown={onComposerKeyDown}
          onSend={onSend}
          disabled={disabled}
          uploading={uploading}
          onFilePick={onFilePick}
          onSendLocation={onSendLocation}
          isMobileLayout={isMobileLayout}
          onTextAreaFocus={onComposerFocusScroll}
        />
      )) : null}
    </section>
  );
}

function isSameDay(leftIso: string, rightIso: string): boolean {
  const left = new Date(leftIso);
  const right = new Date(rightIso);
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function dateLabel(iso: string): string {
  const now = new Date();
  const dt = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msgDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.floor((today - msgDay) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return dt.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

type TimelineEntry =
  | { kind: "separator"; key: string; label: string }
  | { kind: "message"; key: string; message: Message; groupStart: boolean; groupEnd: boolean };

function isGroupableMessage(message: Message): boolean {
  if (message.type === "SYSTEM" || message.type === "LOCATION") return false;
  if (message.type === "IMAGE" || message.type === "VIDEO") return false;
  if ((message.attachments || []).length > 0) return false;
  return true;
}

function buildTimeline(messages: Message[]): TimelineEntry[] {
  const result: TimelineEntry[] = [];
  for (let i = 0; i < messages.length; i += 1) {
    const current = messages[i];
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;
    if (!prev || !isSameDay(prev.createdAt, current.createdAt)) {
      result.push({ kind: "separator", key: `sep-${current.id}`, label: dateLabel(current.createdAt) });
    }
    const groupedWithPrev = !!prev
      && isGroupableMessage(prev)
      && isGroupableMessage(current)
      && prev.senderId === current.senderId
      && Math.abs(new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 7 * 60 * 1000;
    const groupedWithNext = !!next
      && isGroupableMessage(next)
      && isGroupableMessage(current)
      && next.senderId === current.senderId
      && Math.abs(new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()) < 7 * 60 * 1000;
    result.push({
      kind: "message",
      key: current.id,
      message: current,
      groupStart: !groupedWithPrev,
      groupEnd: !groupedWithNext,
    });
  }
  return result;
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      style={{
        width: 5,
        height: 5,
        borderRadius: 9999,
        background: "#d9d2ff",
        animation: `typingDotPulse 1s ${delay} infinite`,
      }}
    />
  );
}
