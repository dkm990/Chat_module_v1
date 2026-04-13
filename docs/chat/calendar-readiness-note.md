# CALENDAR Room Readiness Note

## Goal
Prepare architecture for future `CALENDAR` room type without changing current backend contracts during Phase 4.

## Places that previously assumed fixed room types
- Capability checks were implicit in UI behavior and presence handling.
- Store fallback for unknown room metadata used a hardcoded direct-room default.
- Room-specific behavior was not centralized.

## Phase 4 adjustments made
- Added centralized capability evaluation module:
  - `web/src/chat/policy/roomCapabilities.ts`
- Capability map now resolves by room type string with a safe fallback profile.
- Store fallback room type changed from hardcoded `DIRECT` to neutral `GROUP`-style fallback when type metadata is missing in transient state.

## What to add when CALENDAR backend support arrives
1. Extend backend enum/DTO `ChatRoomType` with `CALENDAR`.
2. Add `CALENDAR` baseline entry in `roomCapabilities.ts`.
3. Define related-entity policy (`canOpenRelatedEntity`) for calendar object id.
4. Decide send permissions model (open discussion vs restricted updates).
5. Add room title/presence semantics for calendar context.

## Non-goals for now
- No transport changes.
- No managed backend.
- No frontend state ownership transfer to SDK.
