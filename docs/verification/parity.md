# Parity matrix

Reference: Screen Studio 3.7.5-4595. Status at the initial research milestone: implementation not started. “Documented” indicates a requirement source, not a passing test.

| ID | Requirement | Reference evidence | Acceptance |
|---|---|---|---|
| UI-01 | Floating recorder toolbar | Screenshot + AX | Match grouping, dimensions, icons, source menus, keyboard handling |
| UI-02 | Editor frame and sidebar | AX + code; image unresolved | Compare same fixture, panel, window size, theme |
| UI-03 | Timeline and track visibility | AX + guide | Scrub, zoom, scroll, reveal/hide tracks, preserve selection |
| UI-04 | Settings and command menu | Guide | Keyboard navigation, search, focus restoration |
| IO-01 | MP4 import | Exercised | Import synthetic clip with correct duration, dimensions, and audio |
| IO-02 | Project save/reopen | Guide + package | Round trip all edits and assets; original remains unchanged |
| IO-03 | Presets | Guide | Create, apply, import/export; no media-specific fields leak |
| IO-04 | Recovery | Changelog | Interrupted save/capture produces recoverable state |
| ED-01 | Split and trim | Guide | Frame-correct cut; restore trim; no audio discontinuity caused by wrong mapping |
| ED-02 | Segment speed | Guide | Correct output duration and pitch-preserving audio |
| ED-03 | Undo/redo | Editor control | Restore project state and selection consistently |
| ED-04 | Aspect ratio/crop | AX + guide | Correct geometry in Auto, landscape, square, portrait |
| ZM-01 | Manual zoom | Guide + constants | Add/move/resize; select target; stable deterministic transitions |
| ZM-02 | Auto zoom | Guide | Click-driven targets, no-click behavior, boundary constraints |
| ZM-03 | Instant/smooth animation | Guide | Preview/export frame equivalence |
| BG-01 | Background types | AX + guide | Wallpaper, gradient, color, custom image persist and export |
| BG-02 | Padding/corners/inset/shadow | AX + constants | Correct independent controls and resolution scaling |
| CU-01 | Cursor capture/render | Guide + constants | No baked duplicate; transformed hotspot aligns with clicks |
| CU-02 | Cursor smoothing/visibility | Guide | Idle hide, end stop, loop, shake removal, style changes |
| CU-03 | Click effects/audio | Guide + constants | Time-aligned visuals and sounds |
| CA-01 | Display capture | Recorder | Finalized recording plays with correct duration and geometry |
| CA-02 | Window/area capture | Recorder | Correct bounds, scale, resize behavior |
| CA-03 | Pause/resume/cancel | Changelog | No timing gap; idempotent stop; no orphan process |
| CA-04 | Microphone/system audio | Recorder + guide | Separate streams, select apps, gain/mute honored |
| CA-05 | Camera | Guide + constants | Independent stream, mirroring, rounded overlay |
| CA-06 | Dynamic layouts | Guide | Fullscreen/default/hidden transitions persist and export |
| CA-07 | iPhone/iPad/mirroring | Guide | Real device recording and frame selection; hardware verification required |
| FX-01 | Masks/highlights | Guide | Temporal bounds and source transform honored |
| FX-02 | Motion blur | Guide | Temporal blur consistent in preview and export |
| TX-01 | Captions | Guide | Local transcription, editing, source-time mapping, export |
| TX-02 | Shortcuts | Guide | Captured shortcuts display with configurable visibility |
| AU-01 | Audio enhancement/music | Guide + helpers | Real processing; independent levels; no clipping or drift |
| EX-01 | MP4 export | Guide; reference activation blocked | Probe codec, resolution, fps, duration, audio; compare frames when possible |
| EX-02 | GIF export | Guide | Correct palette, duration, loop setting |
| EX-03 | Export cancel/progress | Requirement | Progress from real work; cancel preserves destination |
| EX-04 | Clipboard/frame copy | Guide | Pasted result is actual image/video data |
| SH-01 | Shareable links/comments | Guide | Working service, upload, access control, playback, comments |
| PK-01 | Packaged macOS app | Requirement | Launch outside dev server; bundled helper/runtime; permissions |

## Media tests

- Twelve-second H.264/AAC synthetic fixture: import duration within one source frame; dimensions 1280×720.
- Cut/speed fixture: [0,4] at 1× plus [8,12] at 2× produces six seconds.
- Silence and no-audio fixtures: export without phantom streams or blocked mux.
- Boundary fixture: cuts at zoom and caption boundaries; no retained removed frames.
- Geometry fixture: corner targets and portrait output; no empty viewport edges.
- Determinism fixture: render frames in shuffled order and compare with sequential output.
- Save fixture: reopen a moved project directory with spaces and Unicode in its path.
- Cancel fixture: cancel during rendering and muxing; existing output remains intact.

## Completion rule

Exact parity remains unverified until every applicable requirement is implemented and its acceptance check passes against a reference. Hardware, account-service, and reference-license dependencies remain visible in the matrix. Passing internal tests alone does not establish reference parity.
