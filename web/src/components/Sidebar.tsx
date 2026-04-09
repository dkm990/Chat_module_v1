type SidebarProps = {
  userId?: string;
  displayName?: string;
  isAuthed?: boolean;
};

const navItems = ["Discovery", "Messages", "Plans", "Events", "Notifications", "Profile"];
const footerItems = ["Settings", "Support"];

export function Sidebar({ displayName, userId, isAuthed }: SidebarProps) {
  const name = displayName?.trim() || (isAuthed ? "User" : "Guest");
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div style={{ height: "100%", minHeight: 0, display: "grid", gridTemplateRows: "auto 1fr auto", padding: 14, gap: 16, overflow: "hidden" }}>
      <div style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "10px 11px", display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.3, fontSize: 16 }}>Fest&Rest</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          aria-hidden
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            background: "linear-gradient(135deg, rgba(132,85,239,0.5), rgba(94,44,145,0.4))",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          {initial}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>{isAuthed ? "Online" : "Guest mode"}</div>
          {isAuthed && userId ? (
            <div style={{ fontSize: 10, opacity: 0.55, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>
              {userId}
            </div>
          ) : null}
        </div>
      </div>
      </div>

      <div style={{ display: "grid", alignContent: "start", gap: 8, minHeight: 0, overflow: "auto" }}>
        {navItems.map((item) => (
          <button
            key={item}
            style={{
              textAlign: "left",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 11,
              background: item === "Messages" ? "linear-gradient(135deg, rgba(186,158,255,0.24), rgba(132,85,239,0.14))" : "rgba(255,255,255,0.03)",
              color: "#fff",
              padding: "10px 12px",
              fontWeight: item === "Messages" ? 800 : 600,
              cursor: "default",
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <button
          style={{
            width: "100%",
            padding: "11px 12px",
            borderRadius: 11,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "linear-gradient(135deg, rgba(186,158,255,0.34), rgba(132,85,239,0.3))",
            color: "#fff",
            fontWeight: 800,
            boxShadow: "0 10px 24px rgba(88,55,155,0.25)",
          }}
        >
          Create Event
        </button>
        {footerItems.map((item) => (
          <button
            key={item}
            style={{
              textAlign: "left",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 11,
              background: "rgba(255,255,255,0.03)",
              color: "#ddd",
              padding: "9px 12px",
              fontWeight: 600,
              cursor: "default",
            }}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
