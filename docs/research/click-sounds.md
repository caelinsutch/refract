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

## Audio generation and chunk mixing

Two independently synthesized profiles (soft and mechanical) now provide down, up, and combined-click samples. They are original transient waveforms, not recordings of the reference mouse hardware, and acoustic parity is not claimed. The samples are deterministic and fade to silence. `clickAudioChunk` mixes a requested range on the edited output clock, including tails crossing chunk boundaries and overlapping cues, without allocating an entire recording of silence. Sample playback rate remains unchanged across clip-speed edits.

The audio verifier builds a one-second output from a trimmed 2× clip, renders in 128-sample chunks at gain 0.25, writes 24-bit PCM WAVs with FFmpeg, then decodes them. Both profiles have nonzero audio at the planned 100/500/700 ms cue positions and exact silence in intervening test windows; decoded length is 48,000 samples. Core tests cover deterministic sample generation, distinct profiles, gain, overlaps, silence, and equivalence between whole-buffer and chunked rendering. All 109 tests and production compilation pass.

Run `node --import tsx scripts/verify-click-audio.ts` to reproduce these generated-audio checks. Project settings, audition controls, live preview scheduling, and encoder integration remain unfinished; no nonfunctional click-sound picker has been exposed.

## Saved settings and MP4 export

Projects now default to disabled click sounds with gain 0.25 and accept the two original synthesized profiles. Settings validate and round-trip with appearance presets. MP4 export consumes a separate mono float-PCM stream on file descriptor 3, generated in one-second chunks. Click gain is applied once in the chunk renderer, and the encoder mixes it with any enabled source, microphone, and music tracks. Export completion waits for both encoder completion and the click-audio pipeline. GIF excludes click audio.

The actual MP4 verifier streamed video and click PCM concurrently, decoded the resulting AAC, and measured sounds at 100/500/700 ms plus quiet intervening windows. The input-index test covers a four-track mix configuration; a four-track encoded acoustic check remains pending. All 110 tests pass and the production desktop/renderer build passes. Run `node --import tsx scripts/verify-click-export.ts` for the encoded check. UI selection, audition, synchronized preview, live cancellation with click audio, and acoustic parity remain unfinished.

## Picker, audition, and live preview implementation

The Cursor inspector now offers None, Soft, and Mechanical. Enabled sounds expose a volume slider, 25% reset, and preview button; changing the profile auditions it. The native range uses 5% increments so the 25% default remains representable. Automatic audition after volume changes is still absent.

The preview hook uses the same sample bank and cue planner as export. A short lookahead schedules normal-pitch Web Audio sources against edited playback time. Pause, profile/project changes, and unmount stop queued sources. Backward time and large discontinuities clear scheduled cues for loop/seek handling. Late scheduling within a sample begins at the elapsed offset instead of replaying the whole transient. Volume updates use a shared gain node; audition does not move the video playhead.

Production compilation and all 110 existing tests pass. The tests establish core sample/timeline/export behavior, not live Web Audio scheduling. Picker interaction, audible preview synchronization, seek/loop behavior, and volume parity with encoded output still need runtime verification. The synthesized profiles remain approximations rather than recordings matching the reference mouse sets.

## Volume audition and asynchronous cleanup

Changing click volume now auditions the selected profile at the new gain, including the 25% reset. Auditions use a single controller: a newer request stops the prior source, pending Web Audio resume requests cannot play stale selections, and leaving a project or choosing None cancels the audition. Ended sources disconnect their gain and source nodes. Stale resume failures after cancellation do not show an unrelated error in a new project.

Three asynchronous regression tests cover out-of-order resume completion, project departure with successful/failed pending resume, and volume replacement with node cleanup. All 115 core tests and the production build pass. These use a controlled AudioContext substitute; actual audible playback and continuous timeline seek/loop synchronization still need runtime verification. The original synthesized profiles still do not establish acoustic parity with Screen Studio.
