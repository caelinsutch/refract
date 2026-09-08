# Reference observations

Reference: Screen Studio 3.7.5-4595, macOS installation inspected September 8, 2026.

## Package evidence

| Evidence | Finding | Confidence |
|---|---|---|
| Info.plist | Electron application; version 3.7.5-4595 | Direct |
| ASAR package metadata | Electron main entry, preload, MP4 and permissions dependencies | Direct |
| Application chunks | Obfuscated JavaScript, React JSX calls, styled-component names | Direct |
| Application maps | No source maps for app dist or Electron bundles | Direct |
| Encoder chunk | Constructs VideoEncoder | Direct |
| Recorder linkage | ScreenCaptureKit, AVFoundation, CoreMedia, CoreVideo, Metal, Swift | Direct |
| Native helpers | Audio composition, transcription, noise reduction, face and mask tracking | Names observed; execution not verified |
| Project constants | project.json and separate recording, assets, metadata, marker concepts | Partial schema only |

Extracted code stays in a separate local research directory outside the repository. No vendor executable has been modified or used as a replacement application's engine.

## Recorder

Observed window screenshot: 855 × 64 pixels as returned by the inspection tool; scale relative to physical display not independently calibrated. Rounded dark gray toolbar, white icons, muted labels. Left close control, four capture modes, camera, microphone, system audio, final menu. These labels and grouping are verified. Hover, source picker, countdown, recording, and pause states remain to be exercised.

## Imported fixture

Input: generated 1280 × 720, 30 fps, twelve-second MP4, H.264 video, 48 kHz AAC tone. File → Create project from video opened the native file picker. Import showed a loader and then an editor project. A personal recent project was visible in the File menu but was not opened for comparison.

The editor accessibility tree showed:

- Project title, project actions, presets, undo/redo controls, export.
- Auto aspect ratio, crop, mask, panel navigation.
- Track visibility, playback controls, playback speed, timeline zoom.
- Wallpaper/Gradient/Color/Image background tabs.
- Wallpaper categories including macOS, Spring, Sunset, Radiant, Energy, Iridescent, Midnight, Glassmorphism, Raycast.
- Blur 0; padding 10; rounding 12; inset 0; shadow 0.75.
- Clip label 12s and 1×; zoom timeline insertion hint.

The editor screenshot was white while its accessibility controls remained available. Do not use that white image as a visual target. The export action opened activation; no reference export was obtained.

## Readable configuration constants

| Setting | Value | Caveat |
|---|---:|---|
| Background padding ratio | 10 | Pixel interpretation not confirmed |
| Inset edges | 0 | All four sides |
| Inset alpha | 0.5 | Compositor interpretation pending |
| Motion blur amount | 1 | Separate cursor/move/zoom values also 1 |
| Cursor size | 1.5 | Scaling semantics to verify |
| Cursor rotation ratio | 0.5 | Relationship to velocity to verify |
| Cursor shake threshold | 500 | Units to verify |
| Shadow intensity | 0.75 | Matches UI |
| Shadow angle/distance/blur | 90 / 25 / 20 | Units to verify |
| Camera size / roundness | 0.35 / 0.25 | Relative dimensions to verify |
| Camera position | x=1, y=1 | Normalized bottom-right inferred |
| Camera scale during zoom | 0.7 | Applied timing to verify |
| Audio volume | 1 | Unity gain inferred |
| Background audio volume | 0.05 | Gain units to verify |
| Click sound volume | 0.25 | Gain units to verify |
| New zoom amount | 2 | UI confirmation pending |
| New manual target | x=0.5, y=0.5 | Center |
| Zoom edge snap ratio | 0.25 | Algorithm to trace |
| Sidebar style width | 320px | Found in editor style strings |

## Open questions

1. Obtain a reliable editor image and measure its geometry, colors, typography, and selected states.
2. Trace spring presets, automatic click clustering, zoom boundary behavior, and crop transformations.
3. Record synthetic input in the reference to inspect independent media and event schemas.
4. Verify capture controls, pause/resume, quick-share, save/reopen, and crash recovery.
5. Reference export needs an activated installation before output-frame parity can be measured.
6. Device capture needs actual supported hardware and a connection test.
