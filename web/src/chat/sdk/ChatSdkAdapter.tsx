import {
  ChatContainer,
  MainContainer,
  Message,
  MessageList,
  MessageSeparator,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import { useMemo, useState } from "react";
import { ChatHeader } from "../../components/ChatHeader";
import { useChatModule } from "../hooks/useChatModule";
import type { RoomCapabilities } from "../policy/roomCapabilities";
import { MessageBodyRenderer } from "../renderers/MessageBodyRenderer";
import { MessageComposer } from "../ui/MessageComposer";
import { buildTimelineEntries, formatPresenceText, mapConversationToChatscope } from "./chatscopeMappers";

type ChatSdkAdapterProps = {
  apiBase: string;
  currentUserId: string;
  isMobileLayout?: boolean;
  keyboardBottomInset?: number;
  onBackToList?: () => void;
  localErrorMessage?: string;
  onLocalError?: (message: string) => void;
  roomCapabilities?: RoomCapabilities;
  actorRole?: "owner" | "admin" | "member";
  onOpenRelatedEntity?: (payload: { roomId: string; eventId?: string | null; venueId?: string | null }) => void;
};

export function ChatSdkAdapter(props: ChatSdkAdapterProps) {
  const {
    apiBase,
    currentUserId,
    isMobileLayout,
    keyboardBottomInset = 0,
    onBackToList,
    localErrorMessage,
    onLocalError,
    roomCapabilities,
    onOpenRelatedEntity,
  } = props;
  const chat = useChatModule();
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<{ userId: string; displayName: string }[]>([]);
  const [searchingInvite, setSearchingInvite] = useState(false);
  const roomId = chat.activeRoomId;
  const activeRoom = chat.activeRoom;
  const loading = roomId ? !!chat.loadingMessagesByRoom[roomId] : false;
  const loadingOlder = roomId ? !!chat.loadingOlderByRoom[roomId] : false;
  const hasOlderMessages = roomId ? !!chat.nextCursorByRoom[roomId] : false;
  const loadOlderError = roomId ? chat.paginationErrorByRoom[roomId] || null : null;
  const isPeerTyping = roomId ? (chat.typingUsersByRoom[roomId]?.length || 0) > 0 : false;
  const unreadBoundaryMessageId = chat.unreadBoundaryMessageId;
  const roomTitle = activeRoom?.displayName || activeRoom?.title || "Conversation";
  const conversationModel = activeRoom ? mapConversationToChatscope(activeRoom, { active: true }) : null;
  const participants = roomId ? chat.participantsByRoom[roomId] || [] : [];
  const participantError = roomId ? chat.participantErrorByRoom[roomId] || "" : "";
  const participantLoading = roomId ? !!chat.loadingParticipantsByRoom[roomId] : false;
  const timeline = useMemo(
    () => buildTimelineEntries(chat.messages, unreadBoundaryMessageId),
    [chat.messages, unreadBoundaryMessageId],
  );

  async function loadOlder() {
    if (!roomId || !hasOlderMessages || loadingOlder) return;
    await chat.loadOlderMessages(roomId, chat.nextCursorByRoom[roomId] || undefined);
  }

  const presenceText =
    activeRoom && roomCapabilities?.canSeePresence
      ? formatPresenceText(activeRoom.counterpartOnline, activeRoom.counterpartLastSeen)
      : "";
  const showHeaderActions = !!(
    roomCapabilities?.canSeePresence ||
    roomCapabilities?.canInviteParticipants ||
    roomCapabilities?.canEditRoomMeta
  );
  const showRoomActions = !!(
    roomCapabilities?.canLeaveRoom ||
    roomCapabilities?.canInviteParticipants ||
    roomCapabilities?.canRemoveParticipants ||
    roomCapabilities?.canOpenRelatedEntity
  );

  async function searchInviteCandidates() {
    const query = inviteQuery.trim();
    if (!query) {
      setInviteResults([]);
      return;
    }
    setSearchingInvite(true);
    try {
      const items = await chat.searchUsers(query);
      const present = new Set(participants.map((participant) => participant.userId));
      setInviteResults(items.filter((item) => !present.has(item.userId)));
    } finally {
      setSearchingInvite(false);
    }
  }

  async function handleInvite(userId: string) {
    if (!roomId) return;
    const ok = await chat.addParticipants(roomId, [userId]);
    if (!ok) return;
    setInviteResults((prev) => prev.filter((item) => item.userId !== userId));
    setInviteQuery("");
  }

  async function handleLeaveRoom() {
    if (!roomId) return;
    const confirmed = window.confirm("Leave this room?");
    if (!confirmed) return;
    await chat.leaveRoom(roomId);
  }

  async function handleRemoveParticipant(userId: string) {
    if (!roomId) return;
    const confirmed = window.confirm("Remove this participant from the room?");
    if (!confirmed) return;
    await chat.removeParticipant(roomId, userId);
  }

  function handleOpenRelatedEntity() {
    if (!roomId || !activeRoom) return;
    if (onOpenRelatedEntity) {
      onOpenRelatedEntity({
        roomId,
        eventId: activeRoom.eventId || null,
        venueId: activeRoom.venueId || null,
      });
      return;
    }
    onLocalError?.("Related entity navigation is not configured in host app yet.");
  }

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
        activeRoom={activeRoom as any}
        isPeerTyping={isPeerTyping}
        presenceText={presenceText}
        showPresence={!!roomCapabilities?.canSeePresence}
        showActionButtons={showHeaderActions}
        mobileSelectedRoomId={isMobileLayout ? roomId : undefined}
        onMobileBackToList={isMobileLayout ? onBackToList : undefined}
      />

      <MainContainer className="chat-sdk-main-container">
        <ChatContainer className="chat-sdk-chat-container">
          {roomId && showRoomActions ? (
            <div className="chat-sdk-room-actions" style={{ padding: "8px 12px 4px", display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {roomCapabilities?.canOpenRelatedEntity ? (
                  <button type="button" className="chat-sdk-load-older-button" onClick={handleOpenRelatedEntity}>
                    Open related
                  </button>
                ) : null}
                {roomCapabilities?.canLeaveRoom ? (
                  <button type="button" className="chat-sdk-load-older-button" onClick={() => void handleLeaveRoom()}>
                    Leave room
                  </button>
                ) : null}
              </div>
              {roomCapabilities?.canInviteParticipants ? (
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={inviteQuery}
                      onChange={(event) => setInviteQuery(event.target.value)}
                      placeholder="Invite by name"
                      className="chat-sdk-input"
                      style={{
                        flex: 1,
                        minWidth: 160,
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.04)",
                        color: "#fff",
                        padding: "6px 10px",
                      }}
                    />
                    <button
                      type="button"
                      className="chat-sdk-load-older-button"
                      onClick={() => {
                        void searchInviteCandidates();
                      }}
                      disabled={searchingInvite || !inviteQuery.trim()}
                    >
                      {searchingInvite ? "Searching..." : "Invite"}
                    </button>
                  </div>
                  {inviteResults.length > 0 ? (
                    <div style={{ display: "grid", gap: 4 }}>
                      {inviteResults.slice(0, 5).map((candidate) => (
                        <button
                          key={candidate.userId}
                          type="button"
                          className="chat-sdk-load-older-button"
                          onClick={() => {
                            void handleInvite(candidate.userId);
                          }}
                        >
                          Add {candidate.displayName}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {roomCapabilities?.canRemoveParticipants ? (
                <div style={{ display: "grid", gap: 4 }}>
                  {participantLoading ? (
                    <div className="chat-sdk-empty-state">Loading participants...</div>
                  ) : (
                    participants
                      .filter(
                        (participant) =>
                          participant.role !== "owner" && participant.userId !== currentUserId,
                      )
                      .map((participant) => (
                        <button
                          key={participant.userId}
                          type="button"
                          className="chat-sdk-load-older-button chat-sdk-load-older-button--error"
                          onClick={() => {
                            void handleRemoveParticipant(participant.userId);
                          }}
                        >
                          Remove {participant.userId.slice(0, 8)}
                        </button>
                      ))
                  )}
                </div>
              ) : null}
              {participantError ? <div className="chat-sdk-error-banner">{participantError}</div> : null}
            </div>
          ) : null}
          <MessageList
            key={roomId || "empty-room"}
            className="chat-sdk-message-list"
            loading={loading}
            loadingMore={loadingOlder}
            loadingMorePosition="top"
            onYReachStart={() => {
              void loadOlder();
            }}
            disableOnYReachWhenNoScroll={true}
            autoScrollToBottom={true}
            autoScrollToBottomOnMount={true}
            scrollBehavior="auto"
            typingIndicator={
              roomId && isPeerTyping ? (
                <TypingIndicator content={`${conversationModel?.name || roomTitle} is typing`} />
              ) : undefined
            }
          >
            <MessageList.Content>
              {!roomId ? <div className="chat-sdk-empty-state">Select a room to view messages.</div> : null}
              {localErrorMessage || chat.errorMessage ? (
                <div className="chat-sdk-error-banner">{localErrorMessage || chat.errorMessage}</div>
              ) : null}

              {roomId && loadOlderError ? (
                <div className="chat-sdk-load-older-row">
                  <button
                    type="button"
                    className="chat-sdk-load-older-button chat-sdk-load-older-button--error"
                    onClick={() => {
                      void loadOlder();
                    }}
                  >
                    Retry loading earlier messages
                  </button>
                </div>
              ) : null}

              {roomId && !loading && hasOlderMessages && !loadOlderError ? (
                <div className="chat-sdk-load-older-row">
                  <button
                    type="button"
                    className="chat-sdk-load-older-button"
                    onClick={() => {
                      void loadOlder();
                    }}
                  >
                    Load earlier messages
                  </button>
                </div>
              ) : null}

              {roomId && !loading && chat.messages.length === 0 ? (
                <div className="chat-sdk-empty-card">
                  <div className="chat-sdk-empty-card__title">No messages yet</div>
                  <div className="chat-sdk-empty-card__text">
                    Start a conversation with {conversationModel?.name || roomTitle}.
                  </div>
                </div>
              ) : null}

              {!loading
                ? timeline.map((entry) => {
                    if (entry.kind === "date") {
                      return <MessageSeparator key={entry.key} content={entry.label} />;
                    }

                    if (entry.kind === "unread") {
                      return (
                        <MessageSeparator
                          key={entry.key}
                          content={entry.label}
                          className="chat-sdk-unread-separator"
                        />
                      );
                    }

                    return (
                      <Message key={entry.key} model={entry.model} className="chat-sdk-message-row">
                        <Message.CustomContent>
                          <MessageBodyRenderer
                            apiBase={apiBase}
                            message={entry.message}
                            roomTitle={conversationModel?.name || roomTitle}
                            showSender={!entry.message.isOwn && entry.groupStart}
                            groupEnd={entry.groupEnd}
                          />
                        </Message.CustomContent>
                      </Message>
                    );
                  })
                : null}
            </MessageList.Content>
          </MessageList>
        </ChatContainer>
      </MainContainer>

      {roomId ? (
        <MessageComposer
          roomId={roomId}
          disabled={!roomId || !roomCapabilities?.canSendMessage}
          canSendAttachments={!!roomCapabilities?.canSendAttachments}
          canSendLocation={!!roomCapabilities?.canSendLocation}
          uploading={chat.uploading}
          isMobileLayout={isMobileLayout}
          onLocalError={onLocalError}
        />
      ) : null}
    </section>
  );
}
