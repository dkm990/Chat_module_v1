import { useEffect, useRef, useState } from "react";
import type { Me } from "../../chatTypes";
import { AppLayout } from "../../components/AppLayout";
import { Sidebar } from "../../components/Sidebar";
import { SidebarDrawer } from "../../components/SidebarDrawer";
import { ChatHeader } from "../../components/ChatHeader";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useVisualViewportBottomInset } from "../../hooks/useVisualViewportBottomInset";
import { useChatModule } from "../hooks/useChatModule";
import { ConversationList } from "./ConversationList";
import { ConversationView } from "./ConversationView";

type ChatLayoutProps = {
  apiBase: string;
  token: string;
  me: Me | null;
  userId: string;
  isAuthed: boolean;
  inviteBaseUrl: string;
  initialInviteTargetId?: string;
  onInviteHandled?: () => void;
};

export function ChatLayout(props: ChatLayoutProps) {
  const {
    apiBase,
    token,
    me,
    userId,
    isAuthed,
    inviteBaseUrl,
    initialInviteTargetId,
    onInviteHandled,
  } = props;
  const effectiveUserId = me?.userId || userId;
  const chat = useChatModule({ apiBase, token, userId: effectiveUserId });
  const isMobileAppLayout = useMediaQuery("(max-width: 768px)");
  const keyboardBottomInset = useVisualViewportBottomInset(isMobileAppLayout && !!chat.activeRoomId.trim());
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const inviteHandledRef = useRef(false);

  useEffect(() => {
    if (chat.activeRoomId) setMobileDrawerOpen(false);
  }, [chat.activeRoomId]);

  useEffect(() => {
    inviteHandledRef.current = false;
  }, [initialInviteTargetId]);

  useEffect(() => {
    if (!initialInviteTargetId || !effectiveUserId) return;
    if (inviteHandledRef.current) return;
    if (effectiveUserId === initialInviteTargetId) {
      inviteHandledRef.current = true;
      onInviteHandled?.();
      return;
    }
    inviteHandledRef.current = true;
    void chat.openDirectConversation(initialInviteTargetId).then((room) => {
      if (room) onInviteHandled?.();
      else inviteHandledRef.current = false;
    });
  }, [initialInviteTargetId, effectiveUserId, chat, onInviteHandled]);

  const sidebarNode = (
    <Sidebar displayName={me?.displayName} userId={effectiveUserId} isAuthed={isAuthed} />
  );

  const chatListNode = (
    <ConversationList
      isAuthed={isAuthed}
      inviteBaseUrl={inviteBaseUrl}
      currentUserId={effectiveUserId}
      suppressTitle={isMobileAppLayout}
      isMobileLayout={isMobileAppLayout}
    />
  );

  const chatCanvasNode = (
    <ConversationView
      apiBase={apiBase}
      currentUserId={effectiveUserId}
      isMobileLayout={isMobileAppLayout}
      keyboardBottomInset={keyboardBottomInset}
      onBackToList={() => {
        void chat.setActiveRoom("");
      }}
    />
  );

  if (isMobileAppLayout && isAuthed) {
    const mobileShellBg =
      "radial-gradient(circle at 8% 8%, rgba(132,85,239,0.16), transparent 28%), radial-gradient(circle at 92% 18%, rgba(186,158,255,0.1), transparent 32%), #0c0e12";
    return (
      <>
        <div
          style={{
            height: "100%",
            minHeight: "100%",
            width: "100%",
            maxWidth: "100vw",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: mobileShellBg,
            color: "#f6f6fc",
            fontFamily: "Manrope, sans-serif",
          }}
        >
          {!chat.activeRoomId ? (
            <>
              <ChatHeader
                activeRoom={undefined}
                isPeerTyping={false}
                presenceText=""
                mobileSelectedRoomId=""
                onMobileOpenSidebar={() => setMobileDrawerOpen(true)}
              />
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {chatListNode}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {chatCanvasNode}
            </div>
          )}
        </div>
        <SidebarDrawer open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)}>
          {sidebarNode}
        </SidebarDrawer>
      </>
    );
  }

  return <AppLayout sidebar={sidebarNode} chatList={chatListNode} chatCanvas={chatCanvasNode} />;
}
