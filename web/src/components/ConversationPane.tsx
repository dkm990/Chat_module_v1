import type { Message, Room } from "../chatTypes";
import { MessageComposer } from "./MessageComposer";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

type ConversationPaneProps = {
  apiBase: string;
  currentUserId?: string;
  roomId: string;
  activeRoom?: Room;
  isPeerTyping: boolean;
  presenceText: string;
  messages: Message[];
  parseBody: (bodyJson: string) => any;
  messageListRef: React.RefObject<HTMLDivElement | null>;
  onMessagesScroll: () => void;
  text: string;
  onTextChange: (next: string) => void;
  onComposerKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  disabled: boolean;
  uploading: boolean;
  onFilePick: (file: File) => void;
  lat: string;
  lng: string;
  label: string;
  setLat: (v: string) => void;
  setLng: (v: string) => void;
  setLabel: (v: string) => void;
  onSendLocation: () => void;
};

export function ConversationPane(props: ConversationPaneProps) {
  const {
    apiBase, currentUserId, roomId, activeRoom, isPeerTyping, presenceText, messages, parseBody,
    messageListRef, onMessagesScroll, text, onTextChange, onComposerKeyDown,
    onSend, disabled, uploading, onFilePick, lat, lng, label, setLat, setLng,
    setLabel, onSendLocation,
  } = props;
  const title = activeRoom?.displayName || "Conversation";
  const initial = title.slice(0, 1).toUpperCase();

  return (
    <section style={{ display: "grid", gridTemplateRows: "82px 1fr auto", minWidth: 0, background: "radial-gradient(circle at 85% 15%, rgba(132,85,239,0.09), transparent 32%), radial-gradient(circle at 10% 80%, rgba(94,44,145,0.08), transparent 36%), transparent" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 22px", background: "rgba(23,26,31,0.68)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 14,
              background: "linear-gradient(135deg, rgba(132,85,239,0.55), rgba(94,44,145,0.42))",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#f6f6fc",
            }}
          >
            {initial}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
            {activeRoom?.counterpartUserId
              ? (isPeerTyping ? `${activeRoom?.displayName || "User"} is typing...` : presenceText)
              : "Select a room"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#d6d2df" }} aria-label="call">
            ☎
          </button>
          <button style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#d6d2df" }} aria-label="more">
            ⋯
          </button>
        </div>
      </header>

      <div ref={messageListRef} onScroll={onMessagesScroll} style={{ overflow: "auto", padding: "18px 20px 24px" }}>
        {!roomId ? <div style={{ opacity: 0.72, fontSize: 14, textAlign: "center", marginTop: 20 }}>Select a room to view messages.</div> : null}
        {roomId && messages.length === 0 ? <div style={{ opacity: 0.72, fontSize: 14, textAlign: "center", marginTop: 20 }}>No messages yet. Start the conversation.</div> : null}
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 14, display: "flex", justifyContent: m.senderId === currentUserId ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "72%" }}>
              <div style={{ fontSize: 10, opacity: 0.58, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {new Date(m.createdAt).toLocaleString()}
              </div>
              <div style={{ marginTop: 2, padding: "10px 12px", borderRadius: m.senderId === currentUserId ? "16px 16px 6px 16px" : "16px 16px 16px 6px", background: m.senderId === currentUserId ? "linear-gradient(135deg, rgba(186,158,255,0.34), rgba(132,85,239,0.3))" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {m.type === "LOCATION" ? (
                <div>
                  📍 {parseBody(m.bodyJson)?.location?.lat}, {parseBody(m.bodyJson)?.location?.lng}
                  {parseBody(m.bodyJson)?.location?.label ? ` (${parseBody(m.bodyJson)?.location?.label})` : ""}
                </div>
              ) : (
                <div>{parseBody(m.bodyJson)?.text || m.bodyJson}</div>
              )}
              {(m.attachments || []).map((a, idx) => (
                <div key={idx}>
                  {a.kind === "IMAGE" ? (
                    <img src={`${apiBase}${a.publicUrl}`} alt="uploaded" style={{ maxWidth: 260, display: "block", marginTop: 8, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }} />
                  ) : (
                    <video src={`${apiBase}${a.publicUrl}`} controls style={{ maxWidth: 300, display: "block", marginTop: 8, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }} />
                  )}
                </div>
              ))}
            </div>
            </div>
          </div>
        ))}
      </div>

      <MessageComposer
        text={text}
        onTextChange={onTextChange}
        onKeyDown={onComposerKeyDown}
        onSend={onSend}
        disabled={disabled}
        uploading={uploading}
        onFilePick={onFilePick}
        lat={lat}
        lng={lng}
        label={label}
        setLat={setLat}
        setLng={setLng}
        setLabel={setLabel}
        onSendLocation={onSendLocation}
      />
    </section>
  );
}
