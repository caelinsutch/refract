# Architecture

## Decision

Build the macOS desktop application with React, TypeScript, StyleX, and Electron. A Swift helper owns native screen capture and input metadata. A deterministic composition model is shared by preview and export. This decision follows the [research report](../research/report.md); it is not a claim that every internal reference component has been recovered.

## Modules

| Module | Responsibility | Boundary |
|---|---|---|
| Desktop main | Windows, dialogs, project files, process lifecycle | No renderer-controlled shell commands |
| Preload | Typed capabilities and event subscriptions | Context-isolated allowlist |
| Editor | Controls, selection, history, timeline | No direct filesystem access |
| Model | Project schema, time maps, zoom evaluation | Pure TypeScript; unit tested |
| Compositor | Frame layout, screen, cursor, masks, camera, captions | Input is project state plus time and decoded media |
| Capture helper | Sources, ScreenCaptureKit, AVAssetWriter, input events | Structured JSON messages and owned output directory |
| Export coordinator | Decode/render/encode, audio, progress, cancel | Bounded jobs; atomic final output |

React state represents durable edits and low-frequency UI changes. Playback clocks, decoded frames, pointer drags, and compositor caches live outside high-level component state to avoid rerendering the entire editor every frame. UI controls subscribe only to the state they need.

StyleX owns component styles, tokens, dynamic dimensions, and interactive states. A small global stylesheet handles document reset and native form-element details. Styles are compiled during both development and production builds. Typography uses the system UI font and tabular numbers for times and measured values.

## Project format

Each `.framestudio` project is a directory containing `project.json`, `media/`, `events/`, and optional `assets/`. Project JSON contains schema version, ID, title, timestamps, source descriptors, edit segments, zooms, masks, camera layouts, captions, and composition settings. All project media paths are relative and must resolve inside the package. Imported videos are copied into the package to avoid broken links when the original moves.

Sources are immutable. Editing commands produce a new edit decision list and history entry; undo and redo operate on these commands. Save writes a temporary manifest and atomically renames it. An autosave journal records recoverable editor changes. Incomplete capture uses a distinct session status so it cannot be mistaken for a finalized source.

Unknown future schema versions must fail with a useful message. Migration functions handle each known version explicitly. A malformed file, non-finite number, path escape, or missing source must be reported before playback or export.

## Time model

Source time is stored in milliseconds as finite numbers. Output frames use integer indexes and an explicit rational frame rate. A segment specifies source ID, source start/end, speed, and enabled state. Output duration is the sum of each enabled source interval divided by its speed.

Mapping from output to source walks precomputed cumulative segment boundaries. Boundary ownership is half-open: a segment includes its start and excludes its end, except the final output endpoint which resolves to the last valid frame. This avoids duplicated frames and ambiguous cuts.

Zooms, input events, captions, camera, and masks are anchored in source time. They are evaluated after output time maps to the source. Discontinuous cuts reset interpolation context so a cursor or camera does not glide through removed material. Audio uses the same segment list and speed factors.

## Frame layout

The compositor computes a `FrameState` for an explicit output time: source time, source crop, output dimensions, screen destination, zoom center/scale, cursor appearance, camera layout, masks, and text. Output aspect ratio is independent of source aspect ratio. Auto preserves the composition's natural ratio; standard presets constrain it.

The transform chain is source pixels → crop → zoom viewport → rounded screen surface → output frame. Cursor hotspots and masks follow this transform. Camera and captions use output coordinates. Padding and corner settings are normalized against a reference dimension so exports at different resolutions preserve proportions.

The first render implementation uses Canvas2D with a shared drawing function. It supports deterministic seeking and file export. Motion blur requires temporal sub-samples of the same frame-state function; it must not depend on past playback state. GPU acceleration can later implement this contract without changing the project schema.

## Capture lifecycle

States: idle → choosing → ready → countdown → recording ↔ paused → stopping → finalized. Every asynchronous operation carries a session ID. Stale callbacks cannot finalize or overwrite another session. Stop is idempotent, and no new recording begins until the previous writer has finalized or failed.

The Swift helper enumerates displays/windows, starts a filtered stream, captures source geometry and scale, writes media, and samples input using a shared monotonic origin. Screen, system audio, microphone, and camera remain separate source tracks. Cursor pixels are excluded from the screen stream when reliable metadata is captured.

Permission denial and unavailable sources are explicit results. Device capture is a separate adapter. Window movement and display reconfiguration update geometry metadata. Pauses remove elapsed wall time consistently across video, audio, and event timestamps.

## Export

Export is an immutable snapshot of the current project. Preview pauses when export begins. The coordinator validates source availability and encoder support, calculates output frame count, produces frames in timestamp order, and bounds the number of in-flight frames. Progress distinguishes preparation, rendering, audio, muxing, and completion.

Initial MP4 export can stream composed frames to an independently installed FFmpeg process and map audio through the same cut/speed list. GIF uses palette generation and palette application with an explicit loop setting. An existing destination is replaced only after a successful temporary output validates. Cancellation closes pipes, terminates children, and cleans the temporary job directory.

The final application must package an appropriate media runtime or make runtime discovery explicit. Developer-installed FFmpeg is acceptable for the first local build but must be documented as a distribution gap.

## Milestones

1. Research report, architecture, parity criteria, repository.
2. StyleX editor shell and real import/save/reopen with a synthetic fixture.
3. Time mapping, playback, cuts, speed, manual zoom, appearance, history.
4. Deterministic MP4/GIF export with media validation.
5. Native capture, cursor metadata, automatic zoom, source pickers and recording controls.
6. Audio, camera, masks, captions, presets, and remaining application flows.
7. Reference comparison, performance work, packaging, and remaining parity gaps.

Each milestone must update verification evidence. A milestone commit must not label unimplemented controls as working.
