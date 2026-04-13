# Phase 5 Capability Parity Note

## Checked capability list
- `canSendMessage`
- `canSendAttachments`
- `canSendLocation`
- `canInviteParticipants`
- `canRemoveParticipants`
- `canLeaveRoom`
- `canViewParticipants`
- `canSeePresence`
- `canEditRoomMeta`

## Confirmed matches (frontend policy vs backend evaluator)
- `DIRECT`
  - send message/attachments/location: allowed
  - invite/remove participants: denied
  - leave room: denied
- `GROUP`
  - send message/attachments/location: allowed
  - invite/remove participants: allowed only for `OWNER`/`ADMIN`
  - leave room: allowed
- `EVENT`
  - send message/attachments/location: allowed
  - invite/remove participants: denied
  - leave room: allowed
- `VENUE`
  - send message/attachments/location: allowed
  - invite/remove participants: denied
  - leave room: allowed

## Intentional differences
- Backend is stricter at mutation entrypoints because it returns `403 CHAT_CAPABILITY_DENIED` when capability checks fail.
- `canSeePresence` is evaluated on backend by room type only (`DIRECT`), while frontend also factors counterpart availability (`counterpartUserId`) for display behavior. This does not affect mutation safety.

## Notes
- Current backend room entity has no persisted `archived/readOnly` flags, so both layers effectively treat these as not active for now.
- Capability enforcement is now centralized on backend and reused by participant and message mutation flows.
- Phase 5 Step 2 introduced internal observability (`CapabilityGuard`, deny reasons, structured logs) without changing frontend-visible capability semantics.
