# Phase 4 Backend Guardrails Plan

## Scope
Frontend policy layer now gates participant and related-room actions, but backend must enforce the same rules to avoid client-only authorization.

## Current risk hotspots
- `POST /api/chat/v1/rooms/{roomId}/participants`
- `DELETE /api/chat/v1/rooms/{roomId}/participants/{userId}`
- `POST /api/chat/v1/rooms/{roomId}/leave`

Current implementation allows these operations without explicit room-type and actor-role policy checks in `ParticipantService`.

## Guardrail A (safe now, minimal) — Implemented
Add authorization checks in `ParticipantService`:

- actor must be active room member
- for add/remove:
  - actor role must be `OWNER` or `ADMIN`
  - deny for room types where action is unsupported by product policy (`DIRECT`, `EVENT`, `VENUE` for now)
- for leave:
  - deny leaving `DIRECT` (or convert to hide/archive later via product decision)

What is now enforced:
- actor must be active room member (`roomService.getForActiveMember`)
- add/remove participants allowed only for `GROUP` and only for `OWNER`/`ADMIN`
- remove participant cannot target room owner and cannot target self (self-removal must use leave endpoint)
- leave is forbidden for `DIRECT` rooms

Why now:
- low blast radius
- directly matches current frontend capability policy
- closes obvious privilege escalation path

## Guardrail B (next)
Centralize server-side room capability checks in a backend policy helper:

- input: room type, actor role, room state
- output: booleans similar to frontend capabilities

Use it in participant mutations and any future room metadata endpoints.

## Guardrail C (later)
Harden message-level capabilities with same policy source:

- deny sending when room becomes read-only/archived
- align attachment/location permission checks server-side
- add audit logging for denied policy mutations

## Not in this step
- no transport rewrite
- no broad ACL framework
- no schema migration required
