import type { Room } from "../chatTypes";
import type { CSSProperties } from "react";

type ChatHeaderProps = {
  activeRoom?: Room;
  isPeerTyping: boolean;
  presenceText: string;
  showPresence?: boolean;
  showActionButtons?: boolean;
  /** When set, mobile chrome: burger if empty, back if set */
  mobileSelectedRoomId?: string | null;
  onMobileOpenSidebar?: () => void;
  onMobileBackToList?: () => void;
};

export function ChatHeader({
  activeRoom,
  isPeerTyping,
  presenceText,
  showPresence = true,
  showActionButtons = true,
  mobileSelectedRoomId,
  onMobileOpenSidebar,
  onMobileBackToList,
}: ChatHeaderProps) {
  const isMobileChrome = mobileSelectedRoomId !== undefined;
  const hasRoom = !!mobileSelectedRoomId?.trim();

  const title = activeRoom?.displayName || "Conversation";
  const initial = title.slice(0, 1).toUpperCase();
  const subtitle =
    showPresence && activeRoom?.counterpartUserId
      ? isPeerTyping
        ? `${title} is typing...`
        : presenceText
      : "Select a room";

  const listTitle = "Messages";
  const listSubtitle = "Your conversations";

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 4,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: isMobileChrome
          ? `calc(10px + env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) 10px max(12px, env(safe-area-inset-left, 0px))`
          : "12px 18px",
        minHeight: isMobileChrome ? 52 : 56,
        background: "rgba(23,26,31,0.68)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: isMobileChrome ? 12 : 10, minWidth: 0, flex: 1 }}>
        {isMobileChrome && !hasRoom ? (
          <button
            type="button"
            aria-label="Open menu"
            onClick={onMobileOpenSidebar}
            style={iconBtnStyle}
          >
            <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
              ☰
            </span>
          </button>
        ) : null}
        {isMobileChrome && hasRoom ? (
          <button type="button" onClick={onMobileBackToList} style={backBtnStyle}>
            ← Back
          </button>
        ) : null}
        {isMobileChrome && !hasRoom ? (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{listTitle}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{listSubtitle}</div>
          </div>
        ) : (
          <>
            <div
              aria-hidden
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: 14,
                background: "linear-gradient(135deg, rgba(132,85,239,0.55), rgba(94,44,145,0.42))",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#f6f6fc",
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {title}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {subtitle}
              </div>
            </div>
          </>
        )}
      </div>
      {!isMobileChrome && showActionButtons ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button type="button" style={actionBtnStyle} aria-label="call">
            ☎
          </button>
          <button type="button" style={actionBtnStyle} aria-label="video">
            ▷
          </button>
          <button type="button" style={actionBtnStyle} aria-label="menu">
            ⋯
          </button>
        </div>
      ) : hasRoom && showActionButtons ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button type="button" style={mobileActionBtnStyle} aria-label="call">
            ☎
          </button>
          <button type="button" style={mobileActionBtnStyle} aria-label="video">
            ▷
          </button>
          <button type="button" style={mobileActionBtnStyle} aria-label="menu">
            ⋯
          </button>
        </div>
      ) : null}
    </header>
  );
}

const MOBILE_TAP = 44;

const iconBtnStyle: CSSProperties = {
  width: MOBILE_TAP,
  height: MOBILE_TAP,
  minWidth: MOBILE_TAP,
  minHeight: MOBILE_TAP,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#f6f6fc",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  boxSizing: "border-box",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const backBtnStyle: CSSProperties = {
  ...iconBtnStyle,
  width: "auto",
  minWidth: MOBILE_TAP,
  padding: "0 12px",
  fontWeight: 700,
  fontSize: 15,
};

const actionBtnStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#d6d2df",
  boxSizing: "border-box",
};

const mobileActionBtnStyle: CSSProperties = {
  width: 40,
  height: 40,
  minWidth: MOBILE_TAP,
  minHeight: MOBILE_TAP,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#d6d2df",
  boxSizing: "border-box",
  display: "grid",
  placeItems: "center",
  padding: 0,
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};
