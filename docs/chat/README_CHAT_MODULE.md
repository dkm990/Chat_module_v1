# README — Chat Module

## What this module provides
- Backend-driven chat for `DIRECT`, `GROUP`, `EVENT`, `VENUE` rooms.
- Message timeline with text/media/location/system support.
- Invite/participant flows.
- Realtime updates through SockJS + STOMP.
- Capability-gated actions with backend guardrails.

## Integration entry points

Frontend:
- Mount `ChatLayout` from `web/src/chat/ui/ChatLayout.tsx`.
- Use `useChatModule()` for UI wiring; do not call transport directly from UI.
- Keep `chatStore` as the single client state source.

Backend:
- Use existing `/api/chat/v1/**` endpoints (rooms/messages/participants/attachments/me/users).
- Keep `RoomCapabilityEvaluator` + `CapabilityGuard` as centralized capability enforcement.

## Main dependencies
- `ParticipantService` and `MessageService` depend on backend capability layer.
- Frontend `ConversationView` + `MessageComposer` depend on `chatStore` actions and capability policy.

## Where capability logic lives
- Backend authority:
  - `backend/src/main/java/com/plans/chat/policy/RoomCapabilityEvaluator.java`
  - `backend/src/main/java/com/plans/chat/policy/CapabilityGuard.java`
  - `backend/src/main/java/com/plans/chat/policy/CapabilityDenyReason.java`
- Frontend gating:
  - `web/src/chat/policy/roomCapabilities.ts`

## Safe extension points
- Add moderation/state restrictions via evaluator hooks (`isRoomArchived`, `isRoomReadOnly`).
- Add new room-type semantics by extending backend evaluator + frontend policy in parallel.
- Keep REST contracts stable unless a dedicated versioned change is planned.
