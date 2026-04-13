# Phase 5 Capability Audit (Step 2)

## Purpose
This note documents internal capability observability and deny handling introduced in Phase 5 Step 2, while preserving the external API contract.

External contract remains unchanged:
- HTTP `403`
- error code/message: `CHAT_CAPABILITY_DENIED`

## Internal deny reason taxonomy
Defined in `CapabilityDenyReason`:
- `ROLE_INSUFFICIENT`
- `ROOM_TYPE_RESTRICTED`
- `MEMBERSHIP_INACTIVE`
- `DIRECT_ROOM_LEAVE_FORBIDDEN`
- `TARGET_OWNER_PROTECTED`
- `CAPABILITY_NOT_ALLOWED`
- `ROOM_READ_ONLY`
- `ROOM_ARCHIVED`

These reasons are backend-internal and used in structured logs and guard helpers.

## CapabilityGuard responsibilities
`CapabilityGuard` centralizes:
- capability assertion (`requireCapability(...)`)
- explicit deny path (`deny(...)`)
- structured capability decision logging
- throwing standardized `403 CHAT_CAPABILITY_DENIED`

This removes duplicated per-service deny logic.

## Structured logging format
Event name:
- `chat.capability.check`

Fields:
- `action`
- `capabilityName`
- `roomId`
- `actorUserId`
- `actorRole`
- `roomType`
- `allowed`
- `reasonCode`

Log levels:
- `DEBUG` for allowed checks
- `INFO` for denied checks

Example (allowed):
`chat.capability.check action=sendMessage capabilityName=canSendMessage roomId=... actorUserId=... actorRole=MEMBER roomType=GROUP allowed=true reasonCode=NONE`

Example (denied):
`chat.capability.check action=inviteParticipants capabilityName=canInviteParticipants roomId=... actorUserId=... actorRole=MEMBER roomType=GROUP allowed=false reasonCode=ROLE_INSUFFICIENT`

## VPS grep examples
```bash
journalctl -u chat2-backend.service | grep chat.capability.check
journalctl -u chat2-backend.service | grep ROLE_INSUFFICIENT
journalctl -u chat2-backend.service | grep CHAT_CAPABILITY_DENIED
```

## Moderation extension points
`RoomCapabilityEvaluator` has explicit hooks:
- `isRoomArchived(room)` (currently returns `false`)
- `isRoomReadOnly(room)` (currently returns `false`)

These are placeholders for future moderation/state restrictions without changing service-level guard usage.
