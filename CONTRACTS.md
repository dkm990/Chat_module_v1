# Fest&Rest Chat + Auth Contracts (MVP)

## Chat REST
- `POST /api/chat/v1/rooms`
- `GET /api/chat/v1/rooms`
- `GET /api/chat/v1/rooms/{roomId}`
- `GET /api/chat/v1/rooms/{roomId}/messages?cursorCreatedAt=&cursorId=&limit=`
- `POST /api/chat/v1/rooms/{roomId}/messages`
- `POST /api/chat/v1/rooms/{roomId}/participants`
- `DELETE /api/chat/v1/rooms/{roomId}/participants/{userId}`
- `POST /api/chat/v1/rooms/{roomId}/leave`
- `POST /api/chat/v1/rooms/{roomId}/read`
- `POST /api/chat/v1/attachments` (multipart upload)

## Auth REST
- `POST /api/auth/google`
- `POST /api/auth/telegram`

## WebSocket STOMP
- Client -> server:
  - `/app/chat.send`
  - `/app/chat.read`
  - `/app/chat.typing`
- Server -> client:
  - `/topic/rooms.{roomId}.messages.created`
  - `/topic/rooms.{roomId}.messages.read`
  - `/topic/rooms.{roomId}.members.changed`
  - `/topic/rooms.{roomId}.system`
  - `/topic/user.{userId}.rooms.updated`
  - `/topic/user.{userId}.presence.changed` (reserved)

## Ordering Contract
- Cursor pagination only.
- Strict ordering: `ORDER BY created_at DESC, id DESC`.
