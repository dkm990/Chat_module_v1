# Phase 4 Actor Role Resolution

## How role is resolved now

For capability evaluation we now resolve `actorRole` from active room participants:

1. `chatStore.loadParticipants(roomId)` fetches `GET /api/chat/v1/rooms/{roomId}/participants`.
2. `ConversationView` takes `participantsByRoom[activeRoomId]`.
3. It finds participant where `participant.userId === currentUserId`.
4. Found role (`owner | admin | member`) is passed to `evaluateRoomCapabilities(...)`.

Code path:
- `chatStore` participants loading and caching
- `useChatModule` exposure of participant state/actions
- `ConversationView` actor role resolution
- `roomCapabilities` policy evaluation

## Per-room-type behavior

- `DIRECT`: role is still resolved from participants endpoint; practical behavior remains conservative.
- `GROUP`: role is resolved and used for elevated actions (remove participant / edit room meta readiness).
- `EVENT`: role is resolved if backend participant entry exists; policy currently keeps invite/remove conservative by default.
- `VENUE`: same as `EVENT`.

## Safe fallback

If participant list is not loaded yet or user membership entry is missing, fallback role is:

- `member`

This fallback intentionally denies elevated capabilities and prevents over-permission in UI.
