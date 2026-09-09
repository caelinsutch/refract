# Parity matrix

Reference: Screen Studio 3.7.5-4595. Status: partial implementation with verified live display/cursor capture, pause/resume, local captions, and short MP4 exports; exact parity remains open. “Documented” indicates a requirement source, not a passing test.

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

## Current gaps and priorities

- Timeline now supports Zooms, Camera layouts, and Masks with interval creation/trimming. Shortcut overlays and inspector controls now work with saved event data; the shortcut timeline lane is implemented, while the new native event listener and permission flow still need live verification. See [shortcut verification](shortcuts.md).
- Reference track dimensions and base colors have been corrected. Full editor pixel matching, original assets, and several control arrangements remain open.
- Live display capture with a separate cursor track and pause/resume passed. Window/area, microphone/system audio, and camera still need end-to-end checks.
- Per-clip volume and mute now have saved controls and an actual FFmpeg gain/timing check; see [clip audio](clip-audio.md).
- Per-clip cursor hiding now has context-menu/sidebar controls, saved state, and shared-compositor checks.
- Retina preview resolution, paused media seeking, local Swift captions, and short 1080p MP4 exports at 30/60 fps have evidence in the verification documents. An intermittent export stall remains unresolved despite a successful retry; cancellation is bounded.
- Timed camera layouts now have sidebar/timeline editing and a verified short 1080p30 MP4 export; exact reference motion and physical camera capture remain open. Motion blur, click sounds, audio enhancement/music, captured shortcuts, connected-device capture, recovery, and shareable links are not complete.
- Saved manifests now have serialized atomic writes, a validated previous-version backup, and a recovery prompt. Native prompt verification, unsaved-edit recovery, and interrupted-video recovery remain open; see [project recovery](project-recovery.md).
- Cursor, screen movement and zoom motion blur now have optional shared-compositor implementations and pixel checks. Cursor blur has a short encoded MP4 check; screen-blur export, performance profiling and live reference comparison remain open; see [the investigation](../research/motion-blur.md).
- Earlier build evidence below is historical; consult the appended dated verification findings for subsequent corrections.

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

## First editor build evidence

- TypeScript renderer and desktop compilation passed. StyleX production compilation passed.
- Five core tests passed: cut/speed time map, split boundaries, zoom determinism/clamping, no-click auto zoom, invalid range rejection.
- Launched the Electron application and imported the synthetic MP4 through the native picker.
- The live UI reported 12 seconds and rendered the clip on its styled background.
- Screenshot inspection confirmed the initial preview, framing controls, 320px sidebar, and clip/zoom tracks. This is an internal inspection, not reference pixel parity.
- Export, saved-project reopen, recording, camera, and device workflows have not yet passed live verification.

## Recording completion audit

Live reference Record-menu inspection and read-only bundle inspection confirmed a missing workflow beyond manual export: automatic file/clipboard/share-link delivery and the quick-export widget/settings. Refract currently implements only create-project completion. See [recording completion research and acceptance scope](../research/recording-completion.md). The reference editor screenshot remains blank even after raising its window; AX evidence does not establish visual matching.
