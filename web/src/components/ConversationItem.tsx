import type { Room } from "../chatTypes";
import { useState } from "react";

type ConversationItemProps = {
  room: Room;
  active: boolean;
  onClick: () => void;
};

export function ConversationItem({ room, active, onClick }: ConversationItemProps) {
  const [hovered, setHovered] = useState(false);
  const name = room.displayName || room.title || "Chat";
  const initial = name.slice(0, 1).toUpperCase();
  const ts = room.lastMessageTimestamp ? formatConversationTimestamp(room.lastMessageTimestamp) : "";
  const unread = Math.max(0, room.unreadCount || 0);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        textAlign: "left",
        border: active ? "1px solid rgba(186,158,255,0.58)" : hovered ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        background: active ? "linear-gradient(135deg, rgba(186,158,255,0.2), rgba(132,85,239,0.14))" : hovered ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        padding: "14px 12px",
        minHeight: 56,
        color: "#fff",
        marginBottom: 8,
        transition: "background 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
        boxShadow: active ? "0 8px 22px rgba(88,55,155,0.28)" : "none",
        boxSizing: "border-box",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            background: "linear-gradient(135deg, rgba(132,85,239,0.45), rgba(94,44,145,0.35))",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          {initial}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 6 }}>{name}</div>
            <div style={{ fontSize: 10, opacity: 0.72, flexShrink: 0 }}>{ts}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <div style={{ fontSize: 12, opacity: 0.78, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 10, maxWidth: "80%" }}>
              {room.lastMessagePreview || "No messages yet"}
            </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                    {unread > 0 ? (
                      <span
                        style={{
                          minWidth: 19,
                          height: 19,
                          borderRadius: 9999,
                          padding: "0 6px",
                          display: "grid",
                          placeItems: "center",
                          background: "linear-gradient(135deg, #9d7dff, #7c55f3)",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 800,
                          boxShadow: "0 6px 14px rgba(95,62,178,0.32)",
                        }}
                      >
                        {unread > 99 ? "99+" : unread}
                      </span>
                    ) : null}
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 9999,
                        background: room.counterpartOnline ? "#4ade80" : "rgba(255,255,255,0.35)",
                      }}
                    />
                  </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function formatConversationTimestamp(iso: string): string {
  const now = new Date();
  const dt = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msgDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.floor((today - msgDay) / 86400000);
  if (diffDays === 0) return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return dt.toLocaleDateString([], { weekday: "short" });
  return dt.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
}
