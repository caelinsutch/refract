# Timed camera layouts

Reference: [Screen Studio dynamic camera layouts](https://preview.screen.studio/guide/dynamic-camera-layouts-), inspected September 8, 2026. The reference supports Fullscreen, Default, and Hidden intervals, defaults new intervals to Fullscreen, and permits per-layout positioning in Default mode. Creation is available from the camera sidebar or a dedicated layout timeline.

Implemented so far:

- Saved source-time camera layout intervals with Fullscreen, Default, and Hidden modes, nonoverlap validation, and legacy-project defaults.
- Camera sidebar creation at the playhead; edited-time start/end sliders; per-layout overlay position; delete and seek controls; existing project undo/redo.
- Shared preview/export camera geometry that preserves aspect ratio through center cropping, scales from overlay to fullscreen, fades hidden layouts, and returns to the global overlay after an interval. Current transitions use an independently implemented 300 ms smoothstep (instant with Instant animation), evaluated deterministically from boundaries. Interrupted transitions start from the current presentation state.
- Decoded-frame callbacks invalidate paused previews when the source/camera texture reaches Chromium's compositor. This corrected a live initial-camera blank-frame issue without reinstating continuous paused redraws.

Verification:

- 50 core tests pass. Camera tests cover interrupted transitions, deterministic seeking, source-clock mapping after a cut and speed change, global hiding, fullscreen aspect-ratio preservation, serialization, overlap rejection, and older project loading.
- Production TypeScript/StyleX build passes.
- Live desktop: opened a synthetic project with separate screen and camera videos, created a 0–2.5 second Fullscreen layout, saved/reopened it, and verified the first fullscreen camera frame while paused. Seeking to the end showed the camera back in its rounded overlay.
- The initial concern that the wrong stream was displayed was disproven by directly inspecting the synthetic camera's first decoded frame; it contains the observed test pattern.

Remaining acceptance work: the dedicated draggable Layouts timeline, exact reference transition behavior, camera-layout MP4 export inspection, additional live Default/Hidden editing checks, and physical camera capture. These results do not establish full camera parity.
