# Phase 4 Minimal Room Permission Matrix

This is the current baseline used by both frontend policy and backend Guardrail A for participant mutations.

| Room type | Invite participants | Remove participants | Leave room | Notes |
| --- | --- | --- | --- | --- |
| `DIRECT` | No | No | No | Direct chat membership is fixed to two participants. |
| `GROUP` | Yes (`OWNER`, `ADMIN`) | Yes (`OWNER`, `ADMIN`) | Yes (all active members) | `MEMBER` cannot invite or remove participants. |
| `EVENT` | No | No | Yes | Membership mutations are restricted at this phase. |
| `VENUE` | No | No | Yes | Membership mutations are restricted at this phase. |

## Guardrail A implementation scope
- Applies to:
  - `POST /api/chat/v1/rooms/{roomId}/participants`
  - `DELETE /api/chat/v1/rooms/{roomId}/participants/{userId}`
  - `POST /api/chat/v1/rooms/{roomId}/leave`
- Uses deny-by-default behavior for unsupported combinations.
