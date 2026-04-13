import { useEffect, useState } from "react";
import { useChatModule } from "../hooks/useChatModule";
import { evaluateRoomCapabilities } from "../policy/roomCapabilities";
import { ChatSdkAdapter } from "../sdk/ChatSdkAdapter";

type ConversationViewProps = {
  apiBase: string;
  currentUserId: string;
  isMobileLayout?: boolean;
  keyboardBottomInset?: number;
  onBackToList?: () => void;
  onOpenRelatedEntity?: (payload: { roomId: string; eventId?: string | null; venueId?: string | null }) => void;
};

export function ConversationView(props: ConversationViewProps) {
  const { apiBase, currentUserId, isMobileLayout, keyboardBottomInset, onBackToList, onOpenRelatedEntity } = props;
  const chat = useChatModule();
  const [localNotice, setLocalNotice] = useState("");
  const activeParticipants = chat.activeRoomId ? chat.participantsByRoom[chat.activeRoomId] || [] : [];
  const actorRole =
    activeParticipants.find((participant) => participant.userId === currentUserId)?.role || "member";
  const roomCapabilities = evaluateRoomCapabilities({
    room: chat.activeRoom || null,
    actorRole,
  });

  useEffect(() => {
    setLocalNotice("");
  }, [chat.activeRoomId]);

  return (
    <ChatSdkAdapter
      apiBase={apiBase}
      currentUserId={currentUserId}
      isMobileLayout={isMobileLayout}
      keyboardBottomInset={keyboardBottomInset}
      onBackToList={onBackToList}
      localErrorMessage={localNotice}
      onLocalError={setLocalNotice}
      roomCapabilities={roomCapabilities}
      actorRole={actorRole}
      onOpenRelatedEntity={onOpenRelatedEntity}
    />
  );
}
