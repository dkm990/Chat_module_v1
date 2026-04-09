import type { Room, UserSearchItem } from "../chatTypes";
import { ConversationItem } from "./ConversationItem";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type ChatListPanelProps = {
  isAuthed: boolean;
  /** Full invite URL for current user, e.g. https://…/invite/<userId>; empty if unavailable */
  inviteLink: string;
  loading: boolean;
  errorMessage?: string;
  rooms: Room[];
  roomId: string;
  onOpenRoom: (roomId: string) => void;
  userQuery: string;
  setUserQuery: (v: string) => void;
  searchUsers: (queryOverride?: string) => void | Promise<void>;
  clearUserSearchResults: () => void;
  searchingUsers: boolean;
  userResults: UserSearchItem[];
  createRoomWithTarget: (targetId: string) => void | Promise<void>;
  /** Hide top "Messages" label when the app shell already shows it in the header (mobile). */
  suppressTitle?: boolean;
  isMobileLayout?: boolean;
};

const NEW_CHAT_DEBOUNCE_MS = 420;

export function ChatListPanel(props: ChatListPanelProps) {
  const {
    isAuthed,
    inviteLink,
    loading,
    errorMessage,
    rooms,
    roomId,
    onOpenRoom,
    userQuery,
    setUserQuery,
    searchUsers,
    clearUserSearchResults,
    searchingUsers,
    userResults,
    createRoomWithTarget,
    suppressTitle,
    isMobileLayout,
  } = props;
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [debouncePending, setDebouncePending] = useState(false);
  const inviteCopiedTimerRef = useRef<number | null>(null);
  const searchUsersRef = useRef(searchUsers);
  const clearUserSearchResultsRef = useRef(clearUserSearchResults);
  searchUsersRef.current = searchUsers;
  clearUserSearchResultsRef.current = clearUserSearchResults;

  function closeNewChat() {
    setNewChatOpen(false);
    setNewChatSearch("");
    setDebouncePending(false);
    clearUserSearchResults();
  }

  function openNewChat() {
    setInviteOpen(false);
    setNewChatSearch("");
    clearUserSearchResults();
    setNewChatOpen(true);
  }

  function closeInvite() {
    setInviteOpen(false);
    setInviteCopied(false);
    if (inviteCopiedTimerRef.current) {
      window.clearTimeout(inviteCopiedTimerRef.current);
      inviteCopiedTimerRef.current = null;
    }
  }

  function openInvite() {
    setNewChatOpen(false);
    setInviteCopied(false);
    setInviteOpen(true);
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      if (inviteCopiedTimerRef.current) window.clearTimeout(inviteCopiedTimerRef.current);
      inviteCopiedTimerRef.current = window.setTimeout(() => {
        setInviteCopied(false);
        inviteCopiedTimerRef.current = null;
      }, 2500);
    } catch {
      setInviteCopied(false);
    }
  }

  async function shareInviteLink() {
    if (!inviteLink || typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title: "Fest&Rest chat",
        text: "Start a conversation with me",
        url: inviteLink,
      });
    } catch {
      /* user cancelled or share failed */
    }
  }

  const canWebShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!newChatOpen) return;
    const q = newChatSearch.trim();
    if (!q) {
      setDebouncePending(false);
      clearUserSearchResultsRef.current();
      return;
    }
    setDebouncePending(true);
    const id = window.setTimeout(() => {
      setDebouncePending(false);
      void searchUsersRef.current(newChatSearch);
    }, NEW_CHAT_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(id);
      setDebouncePending(false);
    };
  }, [newChatSearch, newChatOpen]);

  useEffect(() => {
    if (!newChatOpen && !inviteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (inviteOpen) {
        setInviteOpen(false);
        setInviteCopied(false);
        if (inviteCopiedTimerRef.current) {
          window.clearTimeout(inviteCopiedTimerRef.current);
          inviteCopiedTimerRef.current = null;
        }
      } else {
        setNewChatOpen(false);
        setNewChatSearch("");
        setDebouncePending(false);
        clearUserSearchResultsRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newChatOpen, inviteOpen]);

  const qTrim = newChatSearch.trim();
  const showSearching = searchingUsers || debouncePending;
  const showResultsList = userResults.length > 0;
  const showEmptyNoMatches = qTrim.length > 0 && !showSearching && !showResultsList;

  /* Top safe area is on ChatHeader in mobile /app; avoid double inset here */
  const rootPad = isMobileLayout
    ? "10px max(12px, env(safe-area-inset-right, 0px)) max(14px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px))"
    : "14px";

  return (
    <div
      style={{
        padding: rootPad,
        height: "100%",
        minHeight: 0,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: isMobileLayout ? 12 : 10,
      }}
    >
      {suppressTitle ? null : <div style={{ flexShrink: 0, fontWeight: 800, fontSize: 16 }}>Messages</div>}
      <input
        value={userQuery}
        onChange={(e) => setUserQuery(e.target.value)}
        placeholder="Search conversations"
        disabled={!isAuthed}
        style={{
          width: "100%",
          flexShrink: 0,
          padding: isMobileLayout ? "12px 14px" : "11px 12px",
          minHeight: isMobileLayout ? 48 : undefined,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
          color: "#fff",
          fontSize: isMobileLayout ? 16 : 13,
          outline: "none",
          boxSizing: "border-box",
          touchAction: "manipulation",
        }}
      />
      <div
        style={
          isMobileLayout
            ? {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                flexShrink: 0,
                alignContent: "start",
              }
            : {
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
                gap: 6,
                flexShrink: 0,
                alignContent: "start",
              }
        }
      >
        <button
          type="button"
          onClick={openNewChat}
          disabled={!isAuthed}
          style={{
            padding: "10px 8px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            fontWeight: 700,
            fontSize: isMobileLayout ? 12 : 11,
            minHeight: isMobileLayout ? 48 : 40,
            cursor: isAuthed ? "pointer" : "not-allowed",
            opacity: isAuthed ? 1 : 0.55,
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          New Chat
        </button>
        <button
          type="button"
          onClick={openInvite}
          disabled={!isAuthed || !inviteLink}
          title={!inviteLink ? "Sign in to get your link" : "Invite someone to chat"}
          style={{
            padding: "10px 8px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(186,158,255,0.14)",
            color: "#fff",
            fontWeight: 700,
            fontSize: isMobileLayout ? 12 : 11,
            minHeight: isMobileLayout ? 48 : 40,
            cursor: !isAuthed || !inviteLink ? "not-allowed" : "pointer",
            opacity: !isAuthed || !inviteLink ? 0.5 : 1,
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Invite
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          aria-disabled="true"
          style={{
            padding: "10px 8px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.45)",
            fontWeight: 700,
            fontSize: isMobileLayout ? 12 : 11,
            minHeight: isMobileLayout ? 48 : 40,
            cursor: "not-allowed",
            display: "grid",
            gap: 2,
            placeContent: "center",
            gridColumn: isMobileLayout ? "1 / -1" : undefined,
            touchAction: "manipulation",
          }}
        >
          <span>Add Friend</span>
          <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>Soon</span>
        </button>
      </div>

      {newChatOpen ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(6,8,14,0.55)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onClick={closeNewChat}
        >
          <div
            role="dialog"
            aria-labelledby="new-chat-title"
            style={{
              width: "100%",
              maxWidth: 380,
              maxHeight: "min(520px, 85vh)",
              display: "flex",
              flexDirection: "column",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 16,
              padding: 16,
              background: "linear-gradient(180deg, rgba(28,31,38,0.98), rgba(18,21,28,0.98))",
              boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div>
                <div id="new-chat-title" style={{ fontSize: 16, fontWeight: 800 }}>
                  Start a new chat
                </div>
                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>Find someone by display name and open a direct conversation.</div>
              </div>
              <button
                type="button"
                onClick={closeNewChat}
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: 18,
                  lineHeight: 1,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            <input
              value={newChatSearch}
              onChange={(e) => setNewChatSearch(e.target.value)}
              placeholder="Search by name"
              autoFocus
              style={{
                width: "100%",
                flexShrink: 0,
                padding: "11px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#fff",
                fontSize: 14,
                outline: "none",
                marginBottom: 10,
              }}
            />
            <button
              type="button"
              onClick={() => void searchUsers(newChatSearch)}
              disabled={!qTrim || showSearching}
              style={{
                ...actionBtnStyle,
                marginBottom: 12,
                opacity: !qTrim || showSearching ? 0.5 : 1,
                cursor: !qTrim || showSearching ? "not-allowed" : "pointer",
              }}
            >
              {showSearching ? "Searching…" : "Search users"}
            </button>

            <div style={{ flex: 1, minHeight: 120, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {showSearching ? (
                <div style={{ fontSize: 13, opacity: 0.75, padding: "12px 4px" }}>Looking for people…</div>
              ) : null}
              {!showSearching && !qTrim ? (
                <div style={{ fontSize: 13, opacity: 0.72, padding: "12px 4px", lineHeight: 1.45 }}>
                  Type a name, then wait a moment or tap <strong>Search users</strong>. Pick someone from the list to start chatting.
                </div>
              ) : null}
              {showEmptyNoMatches ? (
                <div style={{ fontSize: 13, opacity: 0.78, padding: "12px 4px", lineHeight: 1.45 }}>
                  No one matches &ldquo;{qTrim}&rdquo;. Try a shorter or different name.
                </div>
              ) : null}
              {showResultsList ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {userResults.map((u) => (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => {
                        void (async () => {
                          await createRoomWithTarget(u.userId);
                          closeNewChat();
                        })();
                      }}
                      style={{
                        textAlign: "left",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.05)",
                        color: "#fff",
                        padding: "11px 12px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "background 120ms ease, border-color 120ms ease",
                      }}
                    >
                      {u.displayName}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {inviteOpen && inviteLink ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 85,
            background: "rgba(6,8,14,0.55)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onClick={closeInvite}
        >
          <div
            role="dialog"
            aria-labelledby="invite-title"
            style={{
              width: "100%",
              maxWidth: 400,
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 16,
              padding: 18,
              background: "linear-gradient(180deg, rgba(28,31,38,0.98), rgba(18,21,28,0.98))",
              boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div>
                <div id="invite-title" style={{ fontSize: 17, fontWeight: 800 }}>
                  Invite to chat
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 13, opacity: 0.78, lineHeight: 1.45 }}>
                  Share this link to start a conversation
                </p>
              </div>
              <button
                type="button"
                onClick={closeInvite}
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: 18,
                  lineHeight: 1,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
            <input
              readOnly
              value={inviteLink}
              onFocus={(e) => e.target.select()}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(255,255,255,0.92)",
                fontSize: 12,
                marginBottom: 12,
                outline: "none",
              }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <button type="button" onClick={() => void copyInviteLink()} style={{ ...inviteBtnPrimary }}>
                Copy link
              </button>
              {canWebShare ? (
                <button type="button" onClick={() => void shareInviteLink()} style={{ ...inviteBtnSecondary }}>
                  Share
                </button>
              ) : null}
            </div>
            {inviteCopied ? (
              <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: "#a7f3d0" }}>Link copied</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!isAuthed ? <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 8 }}>Sign in to load rooms.</div> : null}
      {errorMessage ? (
        <div style={{ fontSize: 12, color: "#ffb8c5", border: "1px solid rgba(255,130,160,0.25)", background: "rgba(255,130,160,0.1)", borderRadius: 10, padding: "8px 10px", marginBottom: 8 }}>
          {errorMessage}
        </div>
      ) : null}
      {isAuthed && !loading && rooms.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 8, border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px" }}>
          No conversations yet. Start a new chat.
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 2, marginTop: 2 }}>
        {loading ? (
          <div style={{ display: "grid", gap: 8 }}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`room-skeleton-${idx}`} style={{ height: 54, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.07), rgba(255,255,255,0.03))" }} />
            ))}
          </div>
        ) : (
          rooms.map((r) => (
            <ConversationItem key={r.id} room={r} active={roomId === r.id} onClick={() => onOpenRoom(r.id)} />
          ))
        )}
      </div>
    </div>
  );
}

const actionBtnStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(186,158,255,0.18)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
};

const inviteBtnPrimary: CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(186,158,255,0.22)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const inviteBtnSecondary: CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
