import type { InviteUser } from "../chatTypes";
import type { CSSProperties } from "react";

export type InviteViewMode = "loading" | "invalid" | "self" | "normal";

type InviteStateViewProps = {
  mode: InviteViewMode;
  inviteTargetId: string;
  inviteTarget: InviteUser | null;
};

export function InviteStateView({ mode, inviteTargetId, inviteTarget }: InviteStateViewProps) {
  if (!inviteTargetId) return null;

  const card: CSSProperties = {
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 12,
  };

  if (mode === "loading") {
    return <div style={card}>Invite: loading profile...</div>;
  }
  if (mode === "invalid") {
    return <div style={{ ...card, color: "#ffb4ab" }}>Invite link is invalid or unavailable.</div>;
  }
  if (mode === "self") {
    return <div style={card}>This is your profile link.</div>;
  }
  const displayName = inviteTarget?.displayName?.trim() || "Invite user";
  const initial = displayName.slice(0, 1).toUpperCase();
  return (
    <div style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
      <div
        aria-hidden
        style={{
          width: 30,
          height: 30,
          borderRadius: "9999px",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(135deg, rgba(129,140,248,0.45), rgba(114,117,145,0.45))",
          color: "#e5e1e4",
          fontWeight: 700,
          fontSize: 12,
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {initial}
      </div>
      <div>
        <div style={{ opacity: 0.75, fontSize: 11 }}>Invite target</div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{displayName}</div>
      </div>
    </div>
  );
}
