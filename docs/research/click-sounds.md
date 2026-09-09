# Click sound behavior

Read-only inspection of installed Screen Studio 3.7.5-4595, using the previously decoded cursor inspector (`B3wsk8PG.js`) and playback module (`5NxSBPmq.js`), establishes these requirements:

- Click sounds default to disabled. The picker offers Apple Magic Mouse and Logitech MX Master sound sets.
- Enabled sounds expose a 0–1 volume slider in 0.1 steps, a reset action, and a preview action. Earlier inspected defaults specify gain 0.25.
- Selection and volume changes audition the sound through the app's audio service.
- Playback distinguishes down, up, and combined click sounds. Nearby transitions less than 250 ms apart can become a single click sound; events above 2× clip speed are skipped.
- Source timestamps map onto edited playback positions. Sound playback itself uses speed 1, so speeding a clip does not pitch up the click sample. The inspected path also skips events mapping to nonpositive playback time.

These observations describe the inspected implementation, not a completed audible comparison. No vendor sound recordings or implementation code have been copied into Refract.

## Metadata prerequisite

Refract's passive native listener now receives left/right/other mouse releases as well as presses, and records the button number and pressed state in optional cursor-event fields. Presses retain `click: true`; releases use `click: false`, avoiding extra zooms or visual click effects. Older cursor tracks and permission-limited polling remain compatible but do not contain release timing.

The native ingestion fixture verifies a right-button down/up pair and checks the release does not become a click. The project round-trip test verifies transition metadata is retained and one press generates one automatic zoom; invalid button numbers and pressed values are rejected. Physical event delivery remains unverified. Sound selection, independent assets, pairing and edited-time scheduling, audition, synchronized preview, and export mixing remain to be implemented before exposing this feature as working.

## Edited-time cue planner

`clickSoundCues` now produces an ordered cue list from retained cursor events. It pairs presses/releases per button within each retained clip: a press shorter than 250 ms becomes one click; longer presses keep down/up cues. This avoids combining transitions across removed footage or different clips. Events in clips above 2× speed and cues at nonpositive edited time are excluded. Legacy click-only metadata produces a combined-click cue. Each result includes source time, edited playback time, button, and sound kind; captured metadata is not mutated.

Three regression tests cover overlapping button presses, the exact 250 ms boundary, removed footage, 2× mapping, suppression above 2×, zero-time behavior, legacy clicks, hidden events, unsorted input, and deterministic repeated planning. All 107 tests and the production build pass. This module is not yet connected to sound selection, audible preview, or export; it does not establish acoustic parity with the reference sound sets.
