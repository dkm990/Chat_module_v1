import type { Me } from "../chatTypes";
import type { CSSProperties } from "react";
import { InviteStateView, type InviteViewMode } from "./InviteStateView";

type AuthInvitePanelProps = {
  me: Me | null;
  userId: string;
  inviteTargetId: string;
  inviteTargetName?: string;
  inviteMode: InviteViewMode | null;
  notice: string;
  devMode: boolean;
  token: string;
  setTokenFromDev: (value: string) => void;
  onCopyInviteLink: () => void;
  ownInviteLink: string;
  onGoogleLogin: () => void;
  telegramContainerId: string;
  isAuthed: boolean;
  onLoadRooms: () => void;
  showLoadRooms?: boolean;
  inviteOnly?: boolean;
  googleReady?: boolean;
};

export function AuthInvitePanel(props: AuthInvitePanelProps) {
  const {
    me, userId, inviteTargetId, inviteTargetName, inviteMode, notice, devMode, token,
    setTokenFromDev, onCopyInviteLink, ownInviteLink, onGoogleLogin, telegramContainerId,
    isAuthed, onLoadRooms, showLoadRooms = true, inviteOnly = false, googleReady = true,
  } = props;
  const spacing = { xs: 8, sm: 12, md: 16, lg: 20 };
  const telegramWrapperStyle: CSSProperties = {
    width: "100%",
    maxWidth: 360,
    marginInline: "auto",
    minHeight: 52,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 8px 18px rgba(6,14,32,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: "6px 0",
  };

  return (
    <>
      <div
        style={{
          marginBottom: spacing.md,
          padding: spacing.md,
          borderRadius: 18,
          background: "rgba(45, 52, 73, 0.42)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(198,197,213,0.18)",
          boxShadow: "0 20px 40px rgba(6,14,32,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: spacing.xs, fontSize: 13 }}>{inviteOnly ? "Invite" : "Welcome"}</div>
        {!inviteOnly ? (
          <div style={{ fontSize: 13, opacity: 0.9, display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 700, overflowWrap: "anywhere" }}>
              {me?.displayName?.trim() || "Not signed in"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.78, overflowWrap: "anywhere" }}>
              {me?.userId || userId || ""}
            </div>
          </div>
        ) : null}
        {!inviteOnly && me?.userId ? (
          <div style={{ marginTop: spacing.sm }}>
            <button
              type="button"
              onClick={onCopyInviteLink}
              style={{
                width: "100%",
                minHeight: 48,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(186,158,255,0.22)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                touchAction: "manipulation",
              }}
            >
              Copy invite link
            </button>
            <div style={{ fontSize: 12, opacity: 0.72, marginTop: spacing.xs, wordBreak: "break-all" }}>{ownInviteLink}</div>
          </div>
        ) : null}
        {inviteMode ? (
          <InviteStateView
            mode={inviteMode}
            inviteTargetId={inviteTargetId}
            inviteTarget={inviteTargetName ? { userId: inviteTargetId, displayName: inviteTargetName } : null}
          />
        ) : null}
        {notice ? <div style={{ marginTop: spacing.xs, fontSize: 12, color: "#ff9ea9" }}>{notice}</div> : null}
      </div>

      <div style={{ display: "grid", gap: spacing.sm }}>
        {!inviteOnly && devMode ? (
          <input
            value={token}
            onChange={(e) => setTokenFromDev(e.target.value)}
            placeholder="DEV: Paste JWT"
            style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 13 }}
          />
        ) : null}
        <div style={telegramWrapperStyle}>
          <div id={telegramContainerId} style={{ width: "100%", display: "flex", justifyContent: "center" }} />
        </div>
        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={!googleReady}
          style={{
            width: "100%",
            minHeight: 48,
            padding: "13px 16px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.92)",
            color: "#111",
            fontWeight: 700,
            fontSize: 16,
            opacity: googleReady ? 1 : 0.8,
            cursor: googleReady ? "pointer" : "not-allowed",
            touchAction: "manipulation",
          }}
        >
          {googleReady ? "Sign in with Google" : "⏳ Google is loading..."}
        </button>
        {showLoadRooms ? (
          <button
            type="button"
            onClick={onLoadRooms}
            disabled={!isAuthed}
            style={{
              width: "100%",
              minHeight: 48,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              opacity: isAuthed ? 1 : 0.5,
              touchAction: "manipulation",
            }}
          >
            Load rooms
          </button>
        ) : null}
      </div>
    </>
  );
}
