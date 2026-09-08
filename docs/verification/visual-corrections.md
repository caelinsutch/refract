# Visual fidelity corrections — September 8, 2026

The first editor was an approximation. User feedback correctly identified that it did not match Screen Studio. Visual parity remains open.

## Evidence and changes

Read-only inspection of Screen Studio 3.7.5's installed renderer definitions yielded the following layout values. The obfuscated string lookup was decoded locally; no vendor source is included in this repository.

| Surface | Reference evidence | Correction |
| --- | --- | --- |
| Editor background | Theme background `#08090D` | Replaced warm gray canvas and header backgrounds |
| Sidebar | Theme backgroundAccent `#13151b` | Replaced warm purple gray |
| Primary control | Theme primary `#4d2ff5` | Updated Export accent |
| Editor body | RecordingEditor video/sidebar padding `16px 14px 0`, gap 2px | Inset the content accordingly |
| Sidebar | 320px width, 8px radius | Rounded and clipped inset panel |
| Timeline | Separate sibling below video/sidebar container | Extended timeline across editor width |
| Layout toolbar | Centered horizontal control groups | Removed invented floating glass enclosure |
| Recording bar | Live screenshot 855 × 64 | Removed 8px wrapper inset and corrected native window bounds |
| Close recorder | Live screenshot circular light button | Replaced plain X with light circular treatment |

The reference editor screenshot repeatedly returned white while accessibility content remained available. This means the measured constants have not yet received a full visual comparison. The native app inspection subsequently timed out. No visual-parity claim is warranted from a successful build alone.

## CSS correction

The global reset was unlayered while StyleX emits cascade layers. This let broad reset rules override component font, color, and outline declarations. The reset now lives in a lower-priority `reset` layer, before the generated StyleX layers. Keyboard focus styles remain defined.

## Next comparisons

Check at equal logical window sizes: titlebar alignment; preview bounds; tab spacing; wallpaper category/thumbnail density; slider tracks and reset affordances; transport alignment; clip/zoom track colors and dimensions; recorder input widths, icons, and popovers. Original wallpaper artwork and Lucide icons still differ from the reference.

## Packaged-app check

The corrected Apple Silicon app bundle launched successfully. The 855 × 64 recorder was visually checked, then the generated twelve-second fixture was imported through the native file picker. The editor displayed the inset sidebar and full-width timeline, and saving returned “Project saved.” A second correction replaced unsupported StyleX border shorthands with explicit width/style/color properties after the first visual check exposed browser-default button outlines. Captions now occupies the fourth sidebar tab, matching the reference accessibility tree. Final screenshot comparison remains pending for that last correction.

## Background panel follow-up

The installed background settings definition confirms: blur 0–100 (wallpaper/image only), padding 0–35, rounded corners 0–200, shadow intensity 0–1, and an expandable advanced section. Advanced settings expose directional shadow, distance 0–100, angle 0–180°, and blur 5–30. Defaults are non-directional, distance 25, angle 90°, blur 20. Enabling directional shadow changes intensity to 0.4; disabling restores 0.75.

These controls now update the shared compositor. Padding, corner, inset, and shadow controls expose individual resets. Copy current frame moved to the top toolbar; unrelated add-zoom and mask actions were removed from the background settings panel. Existing manifests acquire the new shadow defaults on validation.

Two pixel-level tests verify background blur does not blur the recording, and opposite shadow angles move the shadow without moving the recording. All seven tests and the TypeScript/production build pass. MP4/GIF verification still produces 144 frames / six seconds, with encoded-frame mean absolute error 2.322 / 255. The conversion of reference shadow/blur values into Canvas effects is an implementation approximation, not yet an established pixel match. Live UI checking timed out during this pass.

## Timeline timing and width corrections

Zoom regions now display the surviving source interval after cuts, even when one or both original endpoints have been trimmed away. Dragging and resizing convert output-clock displacement through clip speed; a 500ms drag on a 2× clip moves the source interval by 1000ms. At a cut, the start handle maps to the incoming clip and the end handle to the outgoing clip. Whole-region movement clamps at the project edges and preserves its visible duration. Pointer cancellation and lost capture remove drag listeners.

The timeline's default scale now uses the available viewport width instead of a fixed 900px, keeping the ruler and clips fitted when the editor is resized. Four regression tests cover cuts, speed, boundaries, and edge clamping. All eleven tests and the production build pass. These changes correct observed code defects; gesture equivalence with the reference still needs live verification.

## Crop workflow

The Screen Studio crop window was opened and visually inspected. Its 960 × 720 surface has Size width/height steppers, an aspect selector, Position x/y steppers, Reset, a raw-video preview with eight handles, and Confirm changes / Discard changes. Accessibility describes arrow-key movement for the selection and handles.

Refract's Crop action now opens a matching control layout with pixel inputs, aspect presets, eight handles, keyboard movement (Shift for ten pixels), reset, and draft confirm/discard behavior. The crop is saved on the project and consumed by the common preview/export compositor. Auto aspect ratio follows the retained source dimensions; zoom sampling is clamped inside the crop. Crop editing suppresses underlying editor shortcuts.

Three added tests cover constrained handle movement, saved crop validation and dimensions, and actual pixel exclusion with and without zoom. Fourteen tests and the production build pass. Refract's UI connection timed out while its process remained live, so the new dialog has not been visually signed off. It currently uses an editor overlay; the reference uses a separate native window. Native window presentation, finer spacing, crop grid, and full aspect-preset parity remain open.

## Editing history and window lifecycle

History now uses a pure reducer instead of calling state setters inside another state updater. Unrelated actions within 350ms are independent undo steps. Appearance changes group only by changed fields; timeline drag gestures receive distinct IDs. Undo/redo clears the active group, and editing after undo clears the redo branch. Three regression tests cover reducer repeatability, action boundaries, and branch replacement. Seventeen tests pass.

The desktop lifecycle also lacked Dock activation handling: a hidden recorder could keep the app alive after the editor was destroyed, leaving recorder/menu callbacks targeting dead webContents. Editor close now hides its live window, application activation restores a visible surface, and actual Quit allows destruction. This fix follows code inspection; live lifecycle verification is still pending.

## Recording permission startup

The recorder previously opened System Settings without requesting screen access. Its helper now exposes an explicit permission-request command using Apple's [CGRequestScreenCaptureAccess](https://developer.apple.com/documentation/coregraphics/cgrequestscreencaptureaccess()) API. The UI invokes it only from Allow screen recording, opens Settings if still required, and refreshes available sources when focus returns. The bundle includes the screen-capture usage description described in [ScreenCaptureKit documentation](https://developer.apple.com/documentation/screencapturekit).

Native compilation and the TypeScript/production build pass. No permission was granted automatically and a full live capture remains unverified. The older Refract process was confirmed live with no capture helper, but automatic approval review rejected termination because unsaved editor state could be lost. That process and bundle were preserved. A separate candidate bundle is built under `release/candidate` for the next live check after the existing app is saved and closed. `REFRACT_PACKAGE_DIR` optionally selects a separate packaging destination.

## Recording handoff durability

A completed capture previously relied on the renderer receiving an IPC event and issuing a save request. The desktop process now constructs the project, attaches cursor events and initial zooms, and atomically writes `project.json` before notifying the editor. The renderer loads that persisted project rather than recreating it and launching an unawaited save.

The added regression test serializes/reopens the prepared capture project, verifies click-based zoom intervals, and checks malformed/out-of-range cursor handling. Eighteen tests and the production build pass. Live native capture and crash-recovery behavior remain unverified; this change removes the identified renderer-event dependency from initial project persistence.

## Live candidate verification after user closed the prior app

The old process was confirmed absent, the candidate rebuilt, and the candidate app launched successfully. Its recorder responded and displayed the missing-screen-access explanation. The Allow screen recording action was exercised, but a resulting macOS permission grant was not observed; permission-enabled capture remains unverified.

Imported the generated twelve-second fixture through the native picker. The new background/reset controls and tab order appeared in the editor. Opened Crop, changed width from 1280 to 640, confirmed, and visually verified the composition became 640 × 720 in Auto aspect. One Undo restored the original 1280 × 720 values, confirmed by reopening Crop. Discarded the untouched crop draft and saved; the UI reported Project saved.

The crop screenshot showed edge handles being clipped by the preview container; it also confirmed the remaining overlay-versus-native-window difference. A subsequent close-window check encountered changed editor state (a selected zoom and modified playhead), so window close/activation is not counted as verified. The app was left open rather than risking the newly changed state.

## Clip lengths and motion refinement

Clip blocks now have draggable start/end handles. Dragging changes source in/out points through the clip's speed, ripples the edited duration, and clamps at adjacent retained footage and the source bounds. Arrow keys nudge a handle by 10ms of edited time; Shift changes that to 100ms. During a drag, the pixel/time scale stays fixed so resizing the project does not change pointer sensitivity. Clip labels show edited duration. Each drag has its own undo group.

Zoom easing now uses a quintic curve with zero velocity and acceleration at its endpoints. Automatic panning retargets from the current in-flight position when another click arrives, removing the previous position jump. Instant mode remains immediate. Preview and export share these functions. These are motion refinements, not verified equivalence to Screen Studio's spring solver.

Twenty-one tests pass, including clip trim bounds/speed, smooth easing endpoints, and continuity under rapid retargeting. Production build passes. The running candidate predates these last changes and has not been replaced while it is being used.

## Preview zoom targeting

Preview clicks now map through the same destination rectangle and source sampling rectangle used by the compositor. This accounts for background padding, letterboxing, crop offsets, and the active zoom before storing the manual source target. Clicks outside the recording rectangle leave the target unchanged. A rendered landmark regression verifies the resolved source pixel under a cropped, padded, 2× zoom. All 23 core tests, the TypeScript/production build, and MP4/GIF media verification pass. This fixes coordinate accuracy; live interaction and reference motion equivalence remain unverified.

## Consistent clip length controls

Numeric trim controls now use the same source bounds and ripple trim function as the timeline handles, preventing extension into neighboring retained footage. Both numeric edges pause playback, use 10 ms increments, and group continuous edits for undo. A stationary or inward trim on a valid short split no longer expands it to 100 ms; no-op edits return the original project. A short-clip regression test and existing speed/neighbor-boundary tests pass. All 24 core tests and the production build pass; live handle verification is still pending while macOS is locked.

## Cursor sampling

Cursor positions now use binary search over ordered source-time events. Click rings inspect only events in their active 500 ms interval instead of filtering the entire capture every rendered frame. Loaded tracks are sorted and reject nonfinite/out-of-range coordinates; sampling remains bounded before the first event and after the last, and uses the last event at duplicate timestamps. Two regression tests cover these cases and click-window endpoints. All 26 tests and the production build pass. This reduces per-frame event lookup work; it is not a measured playback benchmark or proof of reference cursor-shape/motion parity.

## Reference cursor animation presets

The live Screen Studio animation panel exposes Screen animation style (Focused/Smooth), Cursor animation style (Smooth/Medium/Rapid/None), Motion blur, and advanced blur settings. Its main-editor screenshot remains blank, so this observation is from accessibility structure. Inspection of the installed animation-settings module and shared preset exports identified cursor stiffness/damping/mass: Smooth 470/70/3, Medium 340/60/3, Rapid 530/40/1. These factual parameters are recorded here; vendor source remains outside the repository.

Refract now offers all four cursor choices, using an independently implemented analytic damped spring with cached source-time checkpoints. Position and velocity survive retargeting, and random seeks produce the same result as forward playback. None uses recorded positions directly. The existing smoothing toggle remains compatible. Regression coverage checks retarget continuity, settling, duplicate target subdivision, random seek order, and the faster Rapid response. All 27 tests and the production build pass. Matching preset parameters does not establish identical reference sampling, interpolation, or rendered motion. Screen springs, custom stiffness/damping/mass controls, and motion blur remain outstanding.

## Custom cursor springs

The reference custom picker names its controls Rigidity (stiffness 5–600, step 1), Smoothness (damping 5–200, step 1), and Momentum (mass 0.1–15, step 0.1). Refract now exposes these controls under Customize cursor animation, with reset and preset selection clearing the custom override. The override persists in project appearance data and drives the shared preview/export cursor renderer.

The independent spring solver now handles underdamped, critically damped, and overdamped configurations analytically. Cache entries are keyed by all three parameters and bounded to eight configurations per cursor track. Tests verify finite motion at range extremes, sampling-interval independence, settling, project round trip, and cache updates. All 29 core tests and the production build pass. Native UI and reference-frame comparison of the new controls remain pending; the currently running export-preview bundle predates these animation changes.

## Screen spring motion

Screen zoom scale and target coordinates now use spring checkpoints instead of fixed-duration easing ramps. The observed Focused stiffness/damping/mass is 200/40/2.25; Smooth is 170/50/3. New projects default to Focused, matching the live reference's selected style. Adjacent zooms, auto-zoom clicks, and zoom-out retain the in-flight state and velocity. Instant remains available for existing workflows. The source-time checkpoint model supports deterministic random seeking, uses the shared compositor, and constrains the viewport to valid source bounds.

Tests cover boundary and auto-click continuity, settling, random seeking, instant changes, disabled zooms, and no-click auto zooms. This changes the zoom-out behavior: it begins settling at the end boundary instead of finishing a fixed easing ramp before the boundary. Reference time-series comparison is still needed to establish exact transition scheduling and sampling equivalence. Custom screen spring controls and motion blur remain outstanding.

Validation after screen springs: all 30 tests and the production build pass. Shared MP4/GIF fixtures remain six seconds with 144 frames and correct AAC audio; encoded frame error is 2.345 / 255. The running export-preview app still predates the spring changes.

## Custom screen springs

Screen animation now exposes the same Rigidity, Smoothness, and Momentum controls as cursor animation. Both use a shared control component with separate accessible groups. Selecting a screen preset clears the override; reset returns to the selected preset. Custom screen parameters persist in appearance data, are validated on load, and participate in the motion-cache key. Regression coverage verifies saved-project round trip, distinct motion, reset, Undo, and Redo. All 31 tests and the production build pass. Live UI and reference motion comparison remain pending.

## Installed styling inspection: sidebar, type, and crop

Inspected the installed 3.7.5 editor/shared bundles and the live crop window. The reference editor's main screenshot still returns white while its accessibility tree is available, so a complete pixel comparison is not claimed. Vendor resources remain outside this repository.

Observed values and changes:

| Detail | Installed reference evidence | Refract change |
|---|---|---|
| Sidebar width | Editor layout constant resolves to 340 px | Increased from 320 to 340 px |
| Sidebar content spacing | 32 px vertical / 24 px horizontal padding, stable scrollbar gutter | Replaced 16 / 14 px padding and reserved the gutter |
| Base type | 13 px, weight 450, system/SF font stack, disabled font synthesis | Replaced 12 px default and matched these settings |
| Surface colors | Main #08090D, sidebar #13151b | Existing matching colors retained |
| Crop guide | Live crop window shows three fine grid lines in each direction | Added guides at 25%, 50%, 75% |
| Crop perimeter | Eight circular handles remain fully visible at image edges | Removed clipping; an SVG mask shades only the excluded image area |

The updated packaged editor was opened with the saved spoken-video project. Screenshots verified readable sidebar controls, the new crop grid, and all eight full-frame handles. A temporary width change showed excluded-area shading; Reset restored 1280 px and Discard returned to the editor. AX field text entry was not reliable enough to establish numeric-entry acceptance. The crop surface remains an in-editor modal; the reference uses a separate native window, which remains a parity gap. TypeScript and the production build pass.

## Idle cursor visibility

The installed cursor-settings module exposes “Hide cursor if not moving” and a 500–5000 ms delay. Its initial enabled delay resolves to 2000 ms. Refract now offers the same option and range, with a two-second initial delay. The shared compositor hides the pointer after source-time inactivity and reveals it on a changed position or click. Repeated 16 ms samples at identical coordinates do not keep it visible. Cached activity checkpoints make seeking deterministic without scanning the full recording each frame. The setting persists in projects; older projects default to disabled, and invalid delays are rejected.

All 37 core tests and the TypeScript/production build pass. Tests include pause-like stationary intervals, held positions, clicks without movement, arbitrary seek order, persistence, and invalid configuration. Exact reference fade timing and interaction acceptance remain unverified.

A separate temporary AppKit mouse-down monitor installed successfully and stopped after 30 seconds, reporting zero observed events during an accessibility-driven editor click. This does not establish event delivery or permission readiness. It was not substituted for the recorder's sampled click path.

## Cursor position loop

The installed cursor panel exposes “Loop cursor position,” a 1000–4000 ms duration, and an initial value resolving to 1000 ms. Refract now exposes that switch and duration. Its shared compositor returns the pointer to the first retained source position over the final retained source-time interval, so trimming the beginning changes the return target. The path is deterministic when seeking, clamps on short clips, and reaches the exact starting coordinates at the endpoint. Older projects keep the option disabled.

All 38 tests and the production build pass, including loop boundaries, a trimmed starting target, an interval longer than the retained clip, disabled mode, and absent cursor data. This is an independently implemented smoothstep return, not verified reference motion equivalence. Live control interaction, exact reference easing, and the interaction between looping and idle hiding remain open checks.

## Cursor idle/loop interaction and live controls

Rendered tests exposed idle hiding suppressing an active cursor return. The compositor now reveals a moving loop, retains explicit Hide cursor as an override, and leaves a zero-displacement loop idle. The packaged cursor-controls build loaded a separate synthetic cursor project with both settings enabled. Its controls showed saved values of 2 seconds for looping and 0.5 seconds for idle hiding. Increasing the idle delay changed the visible value; Undo restored 0.5 seconds. The end-frame preview showed the cursor at its starting position.

This live check also exposed an unrelated frozen source picture during paused seeking. Temporary diagnostics showed the timeline at 5447.313 ms while the underlying video element remained at zero despite a 5.427313-second target. Preview decoder/frame-callback changes alone did not resolve it. An explicit local byte-range response implementation is under test; do not treat paused seeking as fixed until source timecode and actual media time agree.

## Timeline visibility, mask editing, and track styling

The live reference track chooser exposes Zooms (1), Camera Layouts (2), Shortcuts (3), and Masks (4). Refract now places a visible-timeline chooser at the left of the transport and supports its implemented Zooms and Masks tracks, including the 1/4 keyboard toggles. Camera Layouts and Shortcuts remain unimplemented timeline types. Hiding a track changes only the editor view; it does not disable its effects.

Installed reference definitions identify 48 px track height, 12 px gaps, 10 px item corner radius, clip color #93610c, zoom color from primary (#4d2ff5), and mask color #82345a. Those replace the prototype's shorter tracks and invented colors. Full pixel parity remains unverified because reference editor screenshots still return white.

Empty-track pointer gestures now create zoom or mask intervals, including backward drags. Both map edited-time boundaries through cuts and clip speed. Masks have selectable interval blocks, move gestures, resize handles, keyboard trim adjustments, and existing sidebar geometry/strength editing. Zoom handles also expose keyboard adjustments. Gesture edits group into one Undo step.

Live verification in the saved synthetic project: a mask dragged from approximately 1.12 to 2.60 seconds reopened at the correct position and width; dragging its end extended it to approximately 3.09 seconds; Right added 10 ms; two Undo actions restored the original end. Dragging the empty zoom track created a selected 2× Auto interval. A native popover fixed a menu that appeared in AX but was not visibly overlaid. Moving mask colors and draft styling into StyleX fixed an inline-style override that had discarded dynamic position/width variables.

The title bar now preserves its explicit class alongside StyleX's generated classes, and its buttons' descendants are excluded from native drag regions. A toolbar Open click successfully opened the native file picker after the correction. All 45 core tests and the production build pass.
