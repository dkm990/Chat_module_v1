# Phase 4 Related Entity Integration Note

## Current status
- Chat module exposes callback contract:
  - `onOpenRelatedEntity({ roomId, eventId, venueId })`
- `ChatSdkAdapter` calls this callback when policy allows `canOpenRelatedEntity`.
- If callback is not provided, UI shows a safe local notice and keeps chat flow intact.

## Why host wiring is not completed in this app
- Current host shell (`App.tsx`) does not have dedicated Event/Venue pages or router targets yet.
- Adding synthetic routes now would be broad product wiring outside Phase 4 scope.

## Required host integration (minimal)
Host app should provide `onOpenRelatedEntity` and decide navigation:

1. if `eventId` is present, navigate to event details page
2. else if `venueId` is present, navigate to venue details page
3. else show non-blocking notice

No chat architecture changes are needed once host routes exist.
