import type { Room } from "../chatTypes";

type RoomListItemProps = {
  room: Room;
  active: boolean;
  onClick: () => void;
};

export function RoomListItem({ room, active, onClick }: RoomListItemProps) {
  const title = room.displayName || room.title || "Chat";
  const initial = title.slice(0, 1).toUpperCase();
  const unread = Math.max(0, room.unreadCount || 0);

  return (
    <button
      style={{
        display: "block",
        width: "100%",
        marginBottom: 10,
        textAlign: "left",
        border: active ? "1px solid rgba(186,158,255,0.62)" : "1px solid rgba(255,255,255,0.08)",
        background: active ? "linear-gradient(135deg, rgba(186,158,255,0.16), rgba(132,85,239,0.1))" : "rgba(255,255,255,0.03)",
        borderRadius: 16,
        padding: 12,
        color: "#fff",
        position: "relative",
        boxShadow: active ? "0 12px 24px rgba(132,85,239,0.2)" : "none",
      }}
      onClick={onClick}
    >
      {active ? <div style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: 9999, background: "#ba9eff" }} /> : null}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          aria-hidden
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: 13,
            color: "#f6f6fc",
            background: "linear-gradient(135deg, rgba(132,85,239,0.45), rgba(94,44,145,0.4))",
            border: "1px solid rgba(255,255,255,0.16)",
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, letterSpacing: 0.1 }}>
              {title}
            </strong>
            <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
          {room.lastMessageTimestamp ? new Date(room.lastMessageTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
        </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 2 }}>
            <div style={{ fontSize: 12, opacity: 0.78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {room.lastMessagePreview || "No messages yet"}
            </div>
            {unread > 0 ? (
              <span
                style={{
                  minWidth: 18,
                  height: 18,
                  padding: "0 6px",
                  borderRadius: 9999,
                  display: "grid",
                  placeItems: "center",
                  background: "#ba9eff",
                  color: "#1b1234",
                  fontSize: 10,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
