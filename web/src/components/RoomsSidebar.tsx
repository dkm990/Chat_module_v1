import type { Room, UserSearchItem } from "../chatTypes";
import { RoomListItem } from "./RoomListItem";

type RoomsSidebarProps = {
  isAuthed: boolean;
  rooms: Room[];
  roomId: string;
  onOpenRoom: (roomId: string) => void;
  userQuery: string;
  setUserQuery: (v: string) => void;
  searchUsers: () => void;
  searchingUsers: boolean;
  userResults: UserSearchItem[];
  createRoomWithTarget: (targetId: string) => void;
  targetUserId: string;
  setTargetUserId: (v: string) => void;
  createRoom: () => void;
};

export function RoomsSidebar(props: RoomsSidebarProps) {
  const {
    isAuthed, rooms, roomId, onOpenRoom, userQuery, setUserQuery, searchUsers,
    searchingUsers, userResults, createRoomWithTarget, targetUserId, setTargetUserId, createRoom,
  } = props;

  return (
    <>
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 18,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 14, letterSpacing: 0.15 }}>New chat</div>
        <input
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Search users by name"
          disabled={!isAuthed}
          style={{ width: "100%", padding: "11px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)", color: "#fff", marginBottom: 10, fontSize: 13 }}
        />
        <button onClick={searchUsers} disabled={!isAuthed || searchingUsers} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", marginBottom: 10, fontWeight: 700, fontSize: 13 }}>
          {searchingUsers ? "Searching..." : "Search users"}
        </button>
        {userResults.map((u) => (
          <button key={u.userId} onClick={() => createRoomWithTarget(u.userId)} disabled={!isAuthed} style={{ width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#fff", marginBottom: 8, fontSize: 13 }}>
            {u.displayName}
          </button>
        ))}
        <input
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          placeholder="Target user UUID"
          disabled={!isAuthed}
          style={{ width: "100%", marginTop: 4, padding: "11px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)", color: "#fff", fontSize: 13 }}
        />
        <button onClick={createRoom} disabled={!isAuthed} style={{ width: "100%", marginTop: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "linear-gradient(135deg, rgba(186,158,255,0.32), rgba(132,85,239,0.26))", color: "#fff", fontWeight: 800, fontSize: 13 }}>
          Create direct room
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 14, letterSpacing: 0.15 }}>Rooms</div>
        {!isAuthed ? <div style={{ fontSize: 12, opacity: 0.7 }}>Sign in to load rooms.</div> : null}
        {isAuthed && rooms.length === 0 ? <div style={{ fontSize: 12, opacity: 0.7 }}>No rooms yet.</div> : null}
        {rooms.map((r) => (
          <RoomListItem key={r.id} room={r} active={roomId === r.id} onClick={() => onOpenRoom(r.id)} />
        ))}
      </div>
    </>
  );
}
