# Phase 4 Room Semantics Matrix

## Scope
Audit of current Fest&Rest chat behavior for room types: `DIRECT`, `GROUP`, `EVENT`, `VENUE`.

## Matrix
| Room type | Current creation/opening flow | Current participant model | Current allowed actions (current behavior) | Missing product rules | Frontend assumptions |
| --- | --- | --- | --- | --- | --- |
| `DIRECT` | Opened via invite target or "New chat" user search (`openDirectConversation`), backend enforces `targetUserId` and 2-member direct pairing. | Exactly two users logically (`directUserLow/high` on backend), frontend receives counterpart fields. | Send text/media/location, read/typing, cannot invite/remove in UI. | Clarify whether "leave direct" should exist as hide/archive; define block/mute semantics. | Presence/last-seen is counterpart-centric; one-to-one subtitle behavior. |
| `GROUP` | Not created from current web UI, but supported by backend create room API and membership APIs. | Multi-member room with roles (`OWNER`/`ADMIN`/`MEMBER`) available in participant DTO. | Send text/media/location works; invite/remove controls exposed for elevated roles via policy. | Room metadata edit policy absent. | Conversation/title driven by `displayName`; no counterpart presence assumption. |
| `EVENT` | Backend can create/reuse by `eventId` (`ensureEventChat`), room list returns type and entity id. | Multi-member room tied to event context. | Send text/media/location works; open-related action available via host callback contract; participant mutations disabled by policy/guardrails. | Define event participant source-of-truth and invite policy (manual vs event membership sync). | Host app must wire event navigation callback target. |
| `VENUE` | Backend can create/reuse by `venueId` (`ensureVenueChat`), room list returns type and entity id. | Multi-member room tied to venue context. | Send text/media/location works; open-related action available via host callback contract; participant mutations disabled by policy/guardrails. | Define moderation/write policy (announcement vs open chat) and venue manager privileges. | Host app must wire venue navigation callback target. |

## Notes
- Backend remains source of truth for room semantics.
- UI now relies on centralized capability policy instead of scattered room type checks.
- Capability defaults are conservative and extensible for future room types.
