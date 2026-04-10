# Chat bodyJson schema

`schemaVersion: 1`

This document defines the canonical `bodyJson` payload shape used by the Fest&Rest chat module. The backend remains the source of truth, but web and future mobile clients should produce and consume these payloads consistently.

## Envelope

All newly created payloads should include:

```json
{
  "schemaVersion": 1
}
```

Older server messages may omit `schemaVersion`. Clients must treat missing `schemaVersion` as legacy payloads and parse them defensively.

## Message types

### TEXT

Required fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Canonical payload version |
| `text` | `string` | yes | Plain text message body |

Optional fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `format` | `"plain"` | no | Reserved for future formatting support |

Canonical example:

```json
{
  "schemaVersion": 1,
  "text": "Hello from Fest&Rest",
  "format": "plain"
}
```

### LOCATION

Required fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Canonical payload version |
| `location.lat` | `number` | yes | Latitude |
| `location.lng` | `number` | yes | Longitude |

Optional fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `location.label` | `string` | no | Human-readable name |
| `text` | `string` | no | Optional caption |

Canonical example:

```json
{
  "schemaVersion": 1,
  "location": {
    "lat": 55.751244,
    "lng": 37.618423,
    "label": "Moscow city center"
  },
  "text": "Meet here"
}
```

### SYSTEM

Required fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Canonical payload version |
| `text` | `string` | yes | Human-readable system message |

Optional fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `system.code` | `string` | no | Machine-readable system code |
| `system.actorId` | `string` | no | User who triggered the event |
| `system.targetUserId` | `string` | no | Affected user |

Canonical example:

```json
{
  "schemaVersion": 1,
  "text": "Alex joined the chat",
  "system": {
    "code": "member.joined",
    "actorId": "c5dc0fa2-bdb5-4b87-91f1-1bf45f37be6b",
    "targetUserId": "c5dc0fa2-bdb5-4b87-91f1-1bf45f37be6b"
  }
}
```

### IMAGE

Required fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Canonical payload version |

Optional fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `text` | `string` | no | Optional caption |

Attachment requirements:

- `attachments` array on the parent message request must contain at least one item.
- Each attachment item should include:
  - `kind`: `"IMAGE"`
  - `storageKey`
  - `publicUrl`
  - `mimeType`
  - `sizeBytes`
  - optional: `width`, `height`, `durationSec`

Canonical example:

```json
{
  "schemaVersion": 1,
  "text": "Photo from the event"
}
```

### VIDEO

Required fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Canonical payload version |

Optional fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `text` | `string` | no | Optional caption |

Attachment requirements:

- `attachments` array on the parent message request must contain at least one item.
- Each attachment item should include:
  - `kind`: `"VIDEO"`
  - `storageKey`
  - `publicUrl`
  - `mimeType`
  - `sizeBytes`
  - optional: `width`, `height`, `durationSec`

Canonical example:

```json
{
  "schemaVersion": 1,
  "text": "Short clip from yesterday"
}
```

## Notes

- `bodyJson` should stay valid JSON, never raw text.
- Clients should preserve unknown fields when possible.
- Attachments are sent as structured message request fields, not embedded binary data inside `bodyJson`.
