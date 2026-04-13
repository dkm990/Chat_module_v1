# Phase 3 Validation Checklist

## Scope
This checklist validates Phase 3 goals:
- Chatscope is presentation-only.
- `chatStore` remains the source of client state.
- Timeline/composer behavior is stable before Phase 4.

## Preconditions
- Frontend built from latest `master`.
- Backend and realtime services are running.
- Test accounts available:
  - `User A`
  - `User B`
- At least one room with message history (`> 50` messages) to test upward pagination.

## Manual Validation Matrix
1. `send text`
- Open active room as `User A`.
- Send short text and multiline text.
- Expected:
  - Message appears immediately (optimistic).
  - Delivery transitions to final state without duplicate bubbles.
  - Room preview updates.

2. `send image`
- Attach image from composer.
- Expected:
  - Upload state visible (composer disabled only while upload is active).
  - Image renders in message timeline.
  - No duplicate on realtime echo.

3. `send location`
- Send location from composer.
- Expected:
  - Location card rendered with coordinates.
  - `Open in maps` link opens correct coordinates.
  - Geolocation denial produces user-visible error banner.

4. `typing lifecycle`
- In same room, type in `User A`, observe `User B`.
- Stop typing for > 1.5s.
- Expected:
  - Typing indicator appears and disappears.
  - Indicator does not stay stuck after message send.

5. `duplicate realtime echo`
- Send several messages quickly from one user.
- Expected:
  - No duplicates from optimistic + realtime merge.
  - Messages ordered by `createdAt`.

6. `pagination up (load older)`
- Scroll to top until older messages load (or click load earlier button).
- Expected:
  - Older page prepends once per cursor step.
  - No duplicate IDs after prepend.
  - Date separators and unread divider remain logically correct.

7. `fast room switch`
- Rapidly switch between 3+ rooms while messages arrive.
- Expected:
  - Correct room messages shown each time.
  - Active room unread counters drop correctly.
  - No cross-room message bleed.

8. `two tabs`
- Open app in two browser tabs as same user.
- Send/read messages in tab 1; observe tab 2.
- Expected:
  - No severe drift in unread/read boundary.
  - Room previews converge after realtime updates.

9. `reconnect mid-room`
- In active room, temporarily disable network and re-enable.
- Expected:
  - Realtime reconnects.
  - New messages continue arriving.
  - No message fan-out duplicates after reconnect.

## Regression Triage Template
For each issue capture:
- `Scenario`: which checklist item failed.
- `Environment`: browser, OS, device.
- `Room type`: DIRECT/GROUP/EVENT/VENUE.
- `Observed`: exact result.
- `Expected`: expected result from checklist.
- `State clues`:
  - active room id
  - message id(s)
  - clientGeneratedId (if present)
  - unread boundary message id
- `Severity`:
  - `P1` blocker
  - `P2` major
  - `P3` minor

## Exit Criteria for Phase 3
- No `P1`.
- No unresolved `P2` in core flows (`text`, `image`, `location`, `pagination`, `reconnect`).
- Timeline remains stable under room switching and realtime updates.
