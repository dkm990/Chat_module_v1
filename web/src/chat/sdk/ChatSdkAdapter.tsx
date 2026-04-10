import {
  ChatContainer,
  MainContainer,
  Message,
  MessageList,
  MessageSeparator,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import { useMemo } from "react";
import { ChatHeader } from "../../components/ChatHeader";
import { useChatModule } from "../hooks/useChatModule";
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
};

export function ChatSdkAdapter(props: ChatSdkAdapterProps) {
  const { apiBase, isMobileLayout, keyboardBottomInset = 0, onBackToList, localErrorMessage, onLocalError } = props;
  const chat = useChatModule();
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
  const timeline = useMemo(
    () => buildTimelineEntries(chat.messages, unreadBoundaryMessageId),
    [chat.messages, unreadBoundaryMessageId],
  );

  async function loadOlder() {
    if (!roomId || !hasOlderMessages || loadingOlder) return;
    await chat.loadOlderMessages(roomId, chat.nextCursorByRoom[roomId] || undefined);
  }

  const presenceText = activeRoom
    ? formatPresenceText(activeRoom.counterpartOnline, activeRoom.counterpartLastSeen)
    : "";

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
        mobileSelectedRoomId={isMobileLayout ? roomId : undefined}
        onMobileBackToList={isMobileLayout ? onBackToList : undefined}
      />

      <MainContainer className="chat-sdk-main-container">
        <ChatContainer className="chat-sdk-chat-container">
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
                      <Message key={entry.key} model={entry.model}>
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
          disabled={!roomId}
          uploading={chat.uploading}
          isMobileLayout={isMobileLayout}
          onLocalError={onLocalError}
        />
      ) : null}
    </section>
  );
}
