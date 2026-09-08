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


## Dedicated timeline implementation

Added a Camera layouts track beside Zooms and Masks, with visibility shortcut 2, pointer creation, interval moving, trim handles, keyboard adjustments, and selection linked to the Camera sidebar. Existing saved layouts reveal the track on load. Nonoverlap constraints clamp movement and trimming at adjacent layouts; reverse creation is limited to the available gap. The sidebar and track share the same saved interval data.

Live checks: created a second interval by dragging, trimmed its end with pointer and arrow key, and moved it left until its start clamped exactly at the first layout’s 2.5-second endpoint. Changing it to Hidden removed the camera from the preview. Undo restored Fullscreen; Redo restored Hidden; saving succeeded. The suite now has 51 passing tests, including neighbor constraints and interval duration preservation across cuts and doubled clip speed.


## MP4 acceptance check

A 5.447313-second synthetic project was exported through the desktop application's actual MP4 path at 1920×1080, 30 fps. The first run exposed a blank camera frame at frame zero despite valid subsequent frames. Export now registers a frame-presentation callback before assigning each video's source and waits for both loaded data and presentation, with error handling and a bounded 10-second timeout. The repeated export was inspected at frames 0, 30, 99, and 150: camera Fullscreen at 0/1 seconds, screen-only Hidden at 3.3 seconds, and rounded overlay at 5 seconds. Frame zero is no longer blank.

Probe result: H.264 1920×1080, 30/1 fps, 164 frames, video duration 5.466667 seconds (ceil-to-frame output); AAC duration 5.439875 seconds. Local ignored output: `work/Camera layout frame-zero.mp4`. Contact sheets and raw synthetic videos remain outside version control. This is a short 30 fps check, not proof of all export modes or the previously intermittent 60 fps stall.

The dedicated track and short MP4 checks are now implemented/verified. Remaining camera work includes closer reference transition matching, live Default-position checks, physical camera capture, and broader resolution/frame-rate coverage.
