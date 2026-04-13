# Chat Module Handover (Fest&Rest)

## 1) Module overview
Chat module is a backend-driven subsystem for real-time messaging inside Fest&Rest.

Supported room types:
- `DIRECT`
- `GROUP`
- `EVENT`
- `VENUE`

Supported message types:
- `TEXT`
- `IMAGE`
- `VIDEO`
- `LOCATION`
- `SYSTEM`

Transport:
- REST for history/mutations
- SockJS + STOMP for realtime events

Source of truth:
- Backend state and backend capability guardrails.

## 2) Architecture summary

### Frontend (`web/src/chat`)
- `api/`: typed REST client wrappers
- `types/`: API DTO and ViewModel contracts
- `mappers/`: pure DTO -> VM transformations
- `adapters/`: orchestration wrappers (conversation/message/participant/realtime)
- `store/`: `chatStore` (single client state source)
- `policy/`: frontend capability policy (`evaluateRoomCapabilities`)
- `sdk/`: Chatscope presentation bridge (`ChatSdkAdapter`, `chatscopeMappers`)
- `renderers/`: custom message rendering (system/location/attachments)
- `ui/`: feature entry components (`ChatLayout`, `ConversationList`, `ConversationView`, `MessageComposer`)
- `hooks/`: integration hooks (`useChatModule`)

### Backend (`backend/src/main/java/com/plans/chat`)
- `room/`: room query/create/orchestration
- `message/`: message history/send/read
- `member/`: participant mutations
- `storage/`: attachment upload + local file storage adapter
- `realtime/`: STOMP/SockJS controllers + interceptors + presence events
- `policy/`: centralized capability model/evaluator/guard/deny reasons
- `security/`: JWT + current user extraction
- `repo/`, `entity/`: persistence layer

### Policy layer design
- `RoomCapabilityEvaluator` is backend capability source for room/member-based actions.
- `CapabilityGuard` is centralized deny/log helper preserving external contract (`403 CHAT_CAPABILITY_DENIED`).
- `CapabilityDenyReason` is internal taxonomy for observability and future moderation expansion.

## 3) Capability model
Capability flags:
- `canSendMessage`
- `canSendAttachments`
- `canSendLocation`
- `canInviteParticipants`
- `canRemoveParticipants`
- `canLeaveRoom`
- `canViewParticipants`
- `canSeePresence`
- `canEditRoomMeta`

Enforcement:
- Frontend: policy-driven UI gating (`web/src/chat/policy/roomCapabilities.ts`)
- Backend:
  - participant mutations enforced in `ParticipantService` via evaluator + guard
  - message send flows enforced in `MessageService` via evaluator + guard

## 4) Guardrail layers
- Guardrail A: participant mutation restrictions (`add/remove/leave`) on backend.
- Guardrail B: centralized backend capability evaluator (`RoomCapabilityEvaluator`).
- Guardrail C: message-level enforcement (`sendMessage/sendAttachment/sendLocation`).
- Observability layer: structured capability audit logs (`chat.capability.check`) with reason taxonomy.

## 5) Reason taxonomy (`CapabilityDenyReason`)
- `ROLE_INSUFFICIENT`: role cannot perform requested action
- `ROOM_TYPE_RESTRICTED`: action not valid for this room type
- `MEMBERSHIP_INACTIVE`: actor is not active member
- `DIRECT_ROOM_LEAVE_FORBIDDEN`: leave is blocked for direct rooms
- `TARGET_OWNER_PROTECTED`: participant removal attempted against owner
- `CAPABILITY_NOT_ALLOWED`: generic deny fallback
- `ROOM_READ_ONLY`: future room state restriction hook
- `ROOM_ARCHIVED`: future room state restriction hook

## 6) REST endpoints used by chat-module

### Rooms
- `GET /api/chat/v1/rooms` — list available rooms + unread/preview metadata
- `GET /api/chat/v1/rooms/{roomId}` — single room details
- `POST /api/chat/v1/rooms` — create/open room (direct/group/event/venue depending payload)

### Messages
- `GET /api/chat/v1/rooms/{roomId}/messages` — paginated history
- `POST /api/chat/v1/rooms/{roomId}/messages` — send message
- `POST /api/chat/v1/rooms/{roomId}/read` — update read boundary

### Participants
- `GET /api/chat/v1/rooms/{roomId}/participants` — active participants
- `POST /api/chat/v1/rooms/{roomId}/participants` — invite/add participants
- `DELETE /api/chat/v1/rooms/{roomId}/participants/{userId}` — remove participant
- `POST /api/chat/v1/rooms/{roomId}/leave` — leave room

### Attachments
- `POST /api/chat/v1/attachments` — upload image/video attachment metadata

### Identity / user discovery
- `GET /api/chat/v1/me` — current chat identity payload
- `GET /api/chat/v1/users/search` — user lookup for invite flow
- `GET /api/chat/v1/users/{userId}/public` — public profile for invite target

## 7) Frontend/backend capability parity status
Reference:
- `docs/chat/phase5-capability-parity.md`

Current intentional difference:
- Backend is mutation-authoritative and can deny with `403 CHAT_CAPABILITY_DENIED`.
- Frontend may use extra UI display context (for example presence rendering details), but not for mutation safety.

## 8) Moderation readiness status
Implemented:
- centralized backend capability evaluator
- centralized deny helper and reason taxonomy
- structured capability decision logging

Prepared:
- evaluator extension hooks:
  - `isRoomArchived(room)`
  - `isRoomReadOnly(room)`

Not implemented yet:
- persisted room moderation state flags
- moderation workflows (freeze/archive lifecycle)
- persistent audit storage (DB-level audit trail)

## 9) Known limitations
- no persisted archived/readOnly room flags yet
- related-entity open action still depends on host app navigation wiring
- moderation workflows and persistent moderation audit are not implemented

## 10) Safe next steps for next developer
Recommended order:
1. Persist room state flags (`archived`, `readOnly`) in backend domain.
2. Enable evaluator hooks to enforce archived/readOnly behavior.
3. Add persistent audit storage for capability denials/actions.
4. Extend capability evaluator + frontend policy for future `CALENDAR` room type.

## 11) Module entrypoint and architecture guardrails
Module entrypoint:
- Frontend mount point is `ChatLayout` (`web/src/chat/ui/ChatLayout.tsx`) from host `App.tsx`.

Do not change without architecture review:
- Backend authority model (`403 CHAT_CAPABILITY_DENIED` deny contract and capability checks in service layer).
- Transport layer (REST + SockJS/STOMP topics and flow ownership).
- `chatStore` as the single client source of chat state.
- Policy separation (`evaluateRoomCapabilities` on frontend, `RoomCapabilityEvaluator` on backend).
- DTO/ViewModel adapter boundary (no DTO parsing directly inside presentation widgets).

First files a new developer should read:
1. `backend/src/main/java/com/plans/chat/policy/RoomCapabilityEvaluator.java`
2. `backend/src/main/java/com/plans/chat/member/ParticipantService.java`
3. `backend/src/main/java/com/plans/chat/message/MessageService.java`
4. `web/src/chat/store/chatStore.ts`
5. `web/src/chat/sdk/ChatSdkAdapter.tsx`

## 12) Recommended first tasks for next developer
1. Add persisted room moderation flags (`archived`, `readOnly`).
2. Wire evaluator hooks to persisted state and enforce room-state restrictions.
3. Add backend audit persistence for capability deny/action events.
4. Define moderation workflows (freeze/archive/unfreeze lifecycle).
5. Extend capability policy/evaluator for future `CALENDAR` room type.
