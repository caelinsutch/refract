# Screen recording editor reconstruction

## Findings

Screen Studio is a capture-and-composition system whose central benefit is editable presentation after recording. Matching its appearance alone would leave the most important behavior missing: independent cursor rendering, click-driven framing, coordinated camera layouts, editable time, and dependable export. The proposed replacement therefore needs a persistent recording model and deterministic composition engine underneath the interface.

The reference installation is version **3.7.5-4595**, inspected on September 8, 2026. The vendor changelog identifies that release as August 5, 2026. Its recent release notes emphasize reliability in recording, audio, captions, and export; this is useful evidence that correctness under editing and export is a first-class acceptance criterion.[^1]

Direct package inspection establishes that the application uses Electron, an obfuscated JavaScript editor, native recording helpers, and a JavaScript video encoder interface. That supports a React/StyleX/Electron interface backed by Swift capture. It does not establish the complete internal architecture: several conclusions below are explicitly proposals or unresolved inferences.

The planned implementation is called **Glissade**. It aims to reproduce the observed workflows while retaining its own source code, application identity, file format, and assets. No vendor account service, licensing mechanism, or proprietary helper is a runtime dependency.

## Evidence and scope

Three evidence classes are kept separate. **Observed** means reproduced in the installed application's UI or found directly in the installed package. **Documented** means described in a linked primary source. **Proposed** means a design decision for the replacement and must not be mistaken for a statement about the reference implementation.

The reference app exposes a floating recording toolbar, editor, settings panels, project actions, and export activation flow. A synthetic twelve-second MP4 with an audio tone was imported to study editor state without using personal recordings. Imported content is important because it isolates editing from capture; separate recorded fixtures will be required to assess cursor and camera behavior.

The app's accessibility tree provides an extensive inventory of controls and values. The recorder and activation windows were visually readable through the inspection interface. The editor's accessibility tree was readable, but its screenshot returned a white surface during this inspection. Consequently, editor geometry inferred from code or documentation is not a verified pixel comparison.

Reference export opened an activation screen. No export from the reference installation has been produced. Export settings can still be researched, and replacement exports can be independently validated, but a rendered-file comparison remains pending an activated reference environment.

## Product behavior

### Recording entry and lifecycle

The observed recorder is a horizontal rounded toolbar. Its first group contains Display, Window, Area, and Device. Separate groups select camera, microphone, and system audio. The initial inspected state displayed no camera, no microphone, and no system audio. A final menu provides additional actions. Labels are small and muted, while source icons carry most of the visual hierarchy.

A faithful reconstruction needs a state machine rather than a single record button. Source selection, readiness, countdown, recording, pause, resume, stopping, finalization, and recovery must have explicit transitions. A second start request during countdown or recording must not create a second session. Finalization must distinguish a completed media file from a writer that has only been asked to stop.

The vendor guide describes system-audio selection across all applications, a single application, or a group. This means system audio cannot be treated merely as microphone input or a single permanently mixed browser stream.[^2] Audio source identity belongs in recording metadata, and the editor should retain separate gain and mute controls.

The documented setup requires screen recording, accessibility, camera, and microphone permissions.[^3] The replacement should request capabilities in context, report denied or unavailable sources accurately, and continue to support importing and editing without capture permissions. Permission state is part of the product flow and should never be represented by a fabricated successful recording.

### Imported media and projects

The import guide describes creating a project from an existing MP4. It explicitly distinguishes imported video from native recordings: imported pixels do not contain editable mouse or camera metadata.[^4] The replacement must preserve this distinction. Detecting an arrow shape in a video is not equivalent to knowing the original cursor trajectory, hotspot, click timing, or cursor type.

Project saving is separate from exporting. The guide documents Save, Save As, recent projects, and a prompt when closing unsaved work.[^5] A project must preserve the original media and edits so it can be reopened, revised, and exported again. A flat MP4 is not a substitute for an editable project.

The installed bundle registers project and preset package extensions. Readable code identifies a project JSON file and separate recording, metadata, asset, and marker concepts. This suggests directory-based storage, but the full on-disk schema has not yet been established. Glissade will use a versioned, independently specified project directory rather than silently claiming vendor project compatibility.

### Timeline and temporal editing

The reference imported fixture produced a clip labeled with twelve seconds and 1× speed. Its editing surface includes a time ruler, playback controls, track visibility, zoom controls, and a zoom track. The guide identifies yellow clip regions, edge trimming, scissors mode, the Option modifier, and C for cutting at the current location.[^6]

The implementation must model source time and edited time separately. For example, keeping source seconds 0–4 at 1× and seconds 8–12 at 2× yields six seconds of output. Every visual and audio feature must query the same map; otherwise captions, cursor motion, camera changes, and audio will drift after cuts.

Speed is a property of a clip or selected fragment, not just a player convenience. The guide exposes it through the clip context menu.[^7] Preview speed, by contrast, changes how quickly the editor plays without changing export duration. These two controls must remain separate in state and UI.

Trimming should retain original source ranges so an edge can be restored. Destructive rewriting of the source would violate that interaction. A deleted edit segment can be removed from the edit decision list while its underlying recording remains available for undo.

### Automatic and manual zoom

The guide describes purple zoom blocks, clicking to add a zoom, dragging edges to change its duration, and selecting a block to configure its zoom amount and targeting mode.[^8] Auto zoom targets recorded clicks. An auto zoom region with no clicks does not acquire a target automatically; manual zoom is the documented alternative.[^9]

Readable constants in the inspected bundle include a default zoom amount of 2, a centered manual target, and an edge-snap ratio of 0.25. Nearby constants represent 300 and 2,500 time units, but their precise interpretation and downstream use need further tracing before they can be treated as verified automatic-zoom timing.

Proposed automatic framing begins by clustering nearby clicks in source time, choosing a target within the visible source crop, then generating editable zoom intervals. The zoom transform must constrain the visible viewport to the source bounds. Reframing from horizontal to vertical should recompute those constraints without discarding the original click positions.

Transition behavior is as significant as the target coordinate. The same analytical spring or precomputed curve should drive both preview and export. A spring integrated from the previous preview frame can vary with frame rate and seeking order; random-access export needs a result determined only by project state and time.

### Cursor composition

The cursor guide includes visibility, size, cursor style, idle hiding, looping back toward the initial position, movement rotation, end-of-video stopping, shake removal, and type optimization.[^10] Those features imply that the original cursor should not be irreversibly baked into captured pixels when recording metadata is available.

Observed defaults in the code include cursor size 1.5, movement rotation ratio 0.5, a shake threshold of 500, no click effect, and no click sound. Their names describe configuration intent; exact physical units and interactions require code tracing and live recording fixtures. Recording and output settings should preserve these values without assuming every literal has a pixel or millisecond interpretation.

Proposed metadata stores timestamped positions in normalized source coordinates, button transitions, cursor identity and hotspot, and event context. A transformed cursor must use the same crop, zoom, and output transform as the screen. Separate screen and cursor coordinate spaces are a frequent cause of apparent sliding or misaligned clicks.

### Background, framing, and appearance

The guide offers wallpaper, gradient, solid color, and custom image backgrounds, together with padding, corner rounding, inset, and shadow.[^11] The imported fixture's accessibility values were background blur 0, padding 10, rounded corners 12, inset 0, and shadow 0.75. These are reference observations, not yet measured rendered units.

The code exposes directional shadow parameters, independent inset sides, opacity, camera layout values, and separate motion-blur strengths. This argues for a structured composition specification rather than scattered CSS properties. The settings panel should update a single project model consumed by both the canvas and exporter.

Glissade's initial wallpaper library will use original gradients and generated geometry. Exact matching to a proprietary wallpaper cannot be claimed for substituted assets. User-supplied images can be embedded in the project, while user-selected system artwork can remain an explicitly selected local asset.

The animation guide distinguishes cursor motion profiles and focused versus smooth screen animation, with independently adjustable blur for cursor motion, screen zoom, and screen movement.[^12] The implementation should treat blur as part of video composition. A CSS blur applied to the whole preview would not reproduce directional temporal blur in exported frames.

### Camera, masks, and captions

Camera layouts are timeline-editable. The guide describes fullscreen camera, a combined default layout, and camera-hidden intervals.[^13] The bundle defaults include camera size 0.35, roundness 0.25, normalized bottom-right position, and scale 0.7 during zoom. These give concrete starting values, while corner interpretation and collision avoidance still require verification.

Masks and highlights are also temporal objects. The guide documents placing them on a timeline and warns that a mask does not follow scrolling content automatically.[^14] A replacement must clearly distinguish a fixed region from a tracked region. Source-space masks should follow the screen transform so zooming does not uncover the selected source pixels.

Captions can be generated locally with Whisper; the guide also describes Apple Speech Recognition on macOS 26 or later. Model selection, language, prompt, editing, size, visibility, and transcript export are exposed, and the documented workflow requires microphone audio.[^15] This is a separate inference subsystem, not simply a text overlay field.

The first caption implementation can accept imported timed text and preserve it in source time. Local transcription follows once audio extraction and remapping are dependable. A transcript should be retimed through cuts and speed changes, never regenerated merely because a visual setting changes.

### Export and sharing

The documented export dimensions are format, resolution, frame rate, and quality. MP4 and GIF are supported, and frame rates include 24, 30, and 60 fps. The guide warns that high resolution, high frame rate, and GIF optimization increase work.[^16] Its relative timing examples are guidance, not benchmarks transferable to another encoder or machine.

A correct exporter renders the edited timeline at explicit output timestamps, applies the same composition used by preview, generates synchronized audio, then finalizes a playable container. Progress must represent real stages. Cancel must terminate workers, close writers, and leave an existing destination intact.

Sharing requires a separate service for uploads, object storage, access control, links, and comments. It cannot be reproduced by generating a URL-looking string. Local export can be completed independently; service parity remains an explicitly tracked requirement with its own deployment and verification work.

## Implementation evidence

The ASAR contains an Electron entry bundle of roughly 7.5 MB, preload bundle of roughly 0.59 MB, and many editor chunks. The package metadata lists Electron integration, persistent storage, download and wallpaper helpers, a permission module, and MP4-related libraries. Application source maps were not present in the inspected app chunks; source maps elsewhere belong to dependencies.

The app chunks contain obfuscated identifiers, rotated-looking string tables, arithmetic constants, React-style JSX calls, and styled-component display names. Component names identify sidebar navigation, slice editor, layout editor, timeline scrollbar, recording timeline, and top-bar groups. A readable style specifies a 320-pixel sidebar. These are useful structural facts, but recovering names is not equivalent to recovering the original TypeScript source.

The encoder chunk directly constructs a `VideoEncoder`. A separate graphics-heavy chunk contains rendering and texture-management code. WebCodecs exposes codec interfaces but does not itself require support for a particular codec.[^17] Glissade must probe capabilities and handle unsupported encoder configurations rather than assuming every Electron build can encode every profile.

Native binaries include recording, audio composition, transcription, noise reduction, dynamic mask tracking, face detection, window enumeration, and window management helpers. Static linkage of the recording binary includes ScreenCaptureKit, AVFoundation, CoreMedia, CoreVideo, Metal, CoreAudio, and Swift libraries. A MobileDevice private-framework linkage is also present; reproducing device support through that implementation would require additional investigation and is not a chosen dependency.

## Architecture evaluation

### React, StyleX, and Electron

This is the selected first implementation. It aligns with the inspected desktop architecture, supports precise HTML-based controls, and gives access to browser video decoding and canvas/WebCodecs composition. StyleX provides compiled styles with a React-friendly API and explicit static-analysis constraints.[^18] The build must actually run the compiler; importing the runtime alone is insufficient.

Electron's built-in desktop capture is useful for source discovery and browser capture workflows, but it is not the complete solution for editable cursor metadata, per-application audio, and native device recording.[^19] A narrow Swift helper can own those tasks while keeping the editor portable at the model level.

The renderer should be isolated, with no unrestricted Node access. Electron's security guidance recommends context isolation, sandboxing, constrained navigation, and validating IPC senders.[^20] The application can expose specific project, capture, and export operations through a typed preload API. It has no need to expose generic shell execution to UI components.

### React Native and StyleX alternatives

React Native macOS is a real Microsoft-maintained platform built around native macOS components.[^21] It could host the UI, but would require a native video surface and a different styling integration. The package named `react-native-stylex` is a separate project with a theming and hook API; it is not interchangeable with Meta's `@stylexjs/stylex` compiler.[^22]

React Strict DOM is a relevant route for sharing styled components across web and native.[^23] It does not by itself settle desktop video composition, macOS capture, or media export. For this project, introducing a second rendering platform before the reference is matched adds verification surface without addressing the hardest media requirements. Shared tokens and pure timeline logic will leave that option open.

### Native capture

Apple's ScreenCaptureKit sample demonstrates content filters, display/window discovery, configurable frame delivery, audio, and microphone outputs. Frames arrive as sample buffers with metadata, including completion status and content geometry.[^24] The proposed helper uses these APIs with AVAssetWriter and a monotonic clock shared by input-event metadata.

Frame queues must be bounded. A slow disk or writer should produce an explicit failure or recoverable session state rather than indefinitely accumulating full-resolution frames. Capture resolution, backing scale, color space, display changes, and exclusion of application controls all need recorded test cases.

### Export and audio processing

The first deterministic compositor can render through Canvas2D, with a later GPU implementation preserving the same frame-state contract. Frame delivery must be bounded and cancelable. Export work is scheduled independently of the editor's live playback clock.

FFmpeg provides well-defined filters for trimming, timestamps, tempo adjustment, mixing, gain, padding, and palette-based GIF output.[^25] It is a suitable independently sourced media tool for validation and an initial export pipeline. Distribution must explicitly package or discover the executable; a development machine's absolute Homebrew path must not become an invisible production dependency.

## Acceptance strategy

Verification is divided into appearance, behavior, media correctness, and durability. UI checks compare the same fixture, panel, selection, dimensions, and theme. Behavior checks exercise controls and verify their resulting state. Media checks inspect frame count, duration, dimensions, codec, audio channels, and selected rendered frames. Durability checks reopen saved projects and exercise cancellation and interrupted operations.

The basic acceptance fixture is twelve seconds of synthetic motion with known audio. Additional fixtures need clicks near each corner, rapid target changes, mixed display scales, window movement, long pauses, typing, microphone plus system audio, portrait reframing, and camera layout transitions. Each fixture should specify the expected output before implementation is judged.

Exact parity is an evidence claim. An implemented control is not verified merely because it renders, and a successful export is not visually matched merely because it plays. The parity matrix therefore retains separate statuses for implementation and reference comparison, with gaps reported explicitly.

## Sources

All live web sources were accessed September 8, 2026. Pages without an explicit publication date are identified as undated. Installed-package observations refer to Screen Studio 3.7.5-4595 and are recorded separately in `observations.md`.

[^1]: Screen Studio. [Changelog](https://screen.studio/changelog). Release 3.7.5-4595, August 5, 2026.
[^2]: Screen Studio. [Recording system audio](https://screen.studio/guide/recording-system-audio). Undated.
[^3]: Screen Studio. [Setting up & Permissions](https://screen.studio/guide/setting-up-permissions). Undated.
[^4]: Screen Studio. [Creating project from existing video](https://preview.screen.studio/guide/creating-project-from-existing-video). Undated; preview-domain guide.
[^5]: Screen Studio. [Saving your project](https://screen.studio/guide/saving-your-project). Undated.
[^6]: Screen Studio. [Trimming](https://screen.studio/guide/trimming). Undated.
[^7]: Screen Studio. [Speeding up the video](https://screen.studio/guide/speeding-up-the-video). Undated.
[^8]: Screen Studio. [Adding & Editing zooms](https://preview.screen.studio/guide/adding-editing-zooms). Undated; preview-domain guide.
[^9]: Screen Studio. [Auto Zoom](https://screen.studio/guide/auto-zoom). Undated.
[^10]: Screen Studio. [Cursor](https://screen.studio/guide/cursor). Undated.
[^11]: Screen Studio. [Background](https://screen.studio/guide/background). Undated.
[^12]: Screen Studio. [Animations](https://screen.studio/guide/animations). Undated.
[^13]: Screen Studio. [Dynamic camera layouts](https://screen.studio/guide/dynamic-camera-layouts-). Undated.
[^14]: Screen Studio. [Adding a mask and highlight](https://screen.studio/guide/adding-a-mask-and-highlight). Undated.
[^15]: Screen Studio. [Captions](https://screen.studio/guide/captions). Undated.
[^16]: Screen Studio. [Explanation of export settings](https://screen.studio/guide/explanation-of-export-settings). Undated.
[^17]: W3C Media Working Group. [WebCodecs](https://www.w3.org/TR/webcodecs/). Working Draft, August 27, 2026.
[^18]: Meta. [StyleX installation](https://stylexjs.com/docs/learn/installation/) and [Defining styles](https://stylexjs.com/docs/learn/styling-ui/defining-styles/). Undated.
[^19]: Electron. [desktopCapturer](https://www.electronjs.org/docs/latest/api/desktop-capturer). Current documentation, undated.
[^20]: Electron. [Security](https://www.electronjs.org/docs/latest/tutorial/security). Current documentation, undated.
[^21]: Microsoft. [React Native macOS introduction](https://microsoft.github.io/react-native-macos/docs/intro). Undated.
[^22]: retyui. [react-native-stylex](https://github.com/retyui/react-native-stylex). Repository README, undated.
[^23]: React. [React Strict DOM](https://github.com/react/react-strict-dom). Repository README, undated.
[^24]: Apple. [Capturing screen content in macOS](https://developer.apple.com/documentation/screencapturekit/capturing-screen-content-in-macos). Sample associated with WWDC24.
[^25]: FFmpeg. [Filters documentation](https://ffmpeg.org/ffmpeg-filters.html). Current documentation, undated.
