import { useEffect, useState } from "react";
import { useChatModule } from "../hooks/useChatModule";
import { ChatSdkAdapter } from "../sdk/ChatSdkAdapter";

type ConversationViewProps = {
  apiBase: string;
  currentUserId: string;
  isMobileLayout?: boolean;
  keyboardBottomInset?: number;
  onBackToList?: () => void;
};

export function ConversationView(props: ConversationViewProps) {
  const { apiBase, currentUserId, isMobileLayout, keyboardBottomInset, onBackToList } = props;
  const chat = useChatModule();
  const [localNotice, setLocalNotice] = useState("");

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
    />
  );
}
