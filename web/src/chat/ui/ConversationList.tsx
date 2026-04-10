import { useMemo, useState } from "react";
import { ChatListPanel } from "../../components/ChatListPanel";
import { useChatModule } from "../hooks/useChatModule";

type ConversationListProps = {
  isAuthed: boolean;
  inviteBaseUrl: string;
  currentUserId: string;
  suppressTitle?: boolean;
  isMobileLayout?: boolean;
};

export function ConversationList(props: ConversationListProps) {
  const { isAuthed, inviteBaseUrl, currentUserId, suppressTitle, isMobileLayout } = props;
  const chat = useChatModule();
  const [userQuery, setUserQuery] = useState("");
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userResults, setUserResults] = useState<{ userId: string; displayName: string }[]>([]);

  const inviteLink = currentUserId ? `${inviteBaseUrl.replace(/\/+$/, "")}/invite/${currentUserId}` : "";

  const filteredRooms = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return chat.rooms;
    return chat.rooms.filter((room) => {
      const title = (room.displayName || room.title || "").toLowerCase();
      const preview = (room.lastMessagePreview || "").toLowerCase();
      return title.includes(query) || preview.includes(query);
    });
  }, [chat.rooms, userQuery]);

  async function searchUsers(queryOverride?: string) {
    const query = (queryOverride ?? userQuery).trim();
    if (!query) {
      setUserResults([]);
      setSearchingUsers(false);
      return;
    }
    setSearchingUsers(true);
    try {
      const items = await chat.searchUsers(query);
      setUserResults(items);
    } finally {
      setSearchingUsers(false);
    }
  }

  return (
    <ChatListPanel
      isAuthed={isAuthed}
      inviteLink={inviteLink}
      loading={chat.loadingRooms}
      errorMessage={chat.errorMessage}
      rooms={filteredRooms}
      roomId={chat.activeRoomId}
      onOpenRoom={(id) => {
        void chat.setActiveRoom(id);
      }}
      userQuery={userQuery}
      setUserQuery={setUserQuery}
      searchUsers={searchUsers}
      clearUserSearchResults={() => setUserResults([])}
      searchingUsers={searchingUsers}
      userResults={userResults}
      createRoomWithTarget={(targetId) => chat.openDirectConversation(targetId)}
      suppressTitle={suppressTitle}
      isMobileLayout={isMobileLayout}
    />
  );
}
