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


## Command menu and settings switches — September 8, 2026

Added a searchable Command menu (⌘K and View menu), covering recording, opening/importing/saving projects, export, split, zoom, mask, crop, frame copy, undo/redo, and settings navigation. A modal dialog keeps editor shortcuts from firing while searching; project actions are disabled without a project. Live desktop checks: searching “open” and pressing Enter opened the native project picker; opening the timeline verification project worked; searching “cursor” and pressing Enter selected Cursor settings; arrow navigation changed the active command; Escape dismissed the menu. Its visual treatment is independently implemented, not a claim of exact reference command-menu parity.

Read-only inspection of the installed reference toggle component confirmed pill-shaped switches, white thumbs, primary-purple enabled backgrounds, and 150 ms transitions. Refract now uses equivalent proportions rather than browser-native square checkboxes. The controls retain accessible names, switch state, associated clickable labels, keyboard activation, focus styles, and reduced-motion handling. Live checks confirmed Hide cursor changes on mouse click and changes back with Enter; the preview responds to the state. Production TypeScript/StyleX build passed.


## Interaction motion and click effects — September 8, 2026

Added shared motion tokens (90 ms press, 140 ms hover feedback, 180 ms surface entrance) and explicit transitions for color, backgrounds, borders, shadows, opacity, and scale. Removed the global transform that shrank timeline clips and trim handles during drags. Timeline buttons and switches stay geometrically stable on press. Slider thumbs gain hover/focus halos and a primary-colored active halo. Visible timelines uses an anchored native popover transition, including discrete exit handling. New command, recorder-option, and task-dialog surfaces have restrained entrances; repeated sidebar switches do not animate. Reduced-motion disables positional movement and transitions. The selector and interface theme remain independent of the rendered recording.

Live checks: the timeline popover renders in the expected position; Escape dismisses it and returns focus to Visible timelines. Build passes. Slow-motion frame-by-frame review remains outstanding; screenshots verify final layout, not motion timing.

Cursor Click effect now offers None, Circle, and Ripple. Boolean settings in earlier project files migrate to None/Ripple. Feedback renders beneath the pointer, on the source clock shared by preview and export. Ripple initial radius now scales consistently with output resolution. Pixel tests cover distinct effects, expiration, backward seek determinism, doubled clip speed, and explicit cursor hiding. Live UI selection of Circle and saving succeeded. These are independently implemented effects; exact reference effect easing and hold behavior are not yet claimed.


## Transport feedback and paused preview work

Play/pause and mute controls now retain both icon glyphs and transition between them, allowing state reversals without replacing the DOM node. Recorder pause/resume and system-audio icons use the same treatment. Reduced-motion switches glyphs immediately; initial render does not animate. Mute now exposes its pressed state and changes its accessible label to Unmute when enabled. Live recorder audio selection updated the icon/label and was restored to its initial setting.

The preview loop now schedules continuous frames only during playback. Project/time changes, image loading, video seek/readiness events, resize observation, and display-density changes invalidate a paused preview. Event listeners and scheduled frames are cleaned up when media or project changes. This avoids repeatedly compositing a full Retina canvas while idle. The image-loading effect also discards stale completions rather than changing the playhead by a fractional amount to trigger an update.

Live regression checks: End seeks to the decoded source frame at 5.400 seconds; Start returns to the first frame; playback advances; pause holds at 2.70 seconds; resume progresses from that position without including paused wall-clock time. Mute/Unmute updates its label and pressed state. Production build and 47 core tests pass. No quantitative GPU benchmark or slow-motion animation capture is claimed.

A live playback completion check initially exposed a throttled-state boundary issue. The boundary now publishes immediately, and the repeat run stopped at exactly `0:05.44 / 0:05.44` with Play available.

## Background panel reference pass — September 9

The user reaffirmed that UI matching must be one-to-one. Functional tests are not visual parity evidence. The installed editor still yields blank screenshots, including after raising the window. The official [Background guide](https://screen.studio/guide/background) provides a usable screenshot: bordered background-type controls with an active underline, compact square wallpaper thumbnails, and the random-selection action above those thumbnails. The live installed AX tree independently confirms the random-action ordering. The guide's vertical navigation differs from the installed bundle's horizontal navigation, so it is not treated as an exact current-version full-window target.

Refract's background panel now uses the bordered/underlined treatment, 32px square thumbnails and the correct random-action order. Teal remains the user-requested accent. The actual light renderer screenshot was inspected after the final build; a dark screenshot was captured as well. The production editor interaction verifier passes. Wallpaper assets/categories, complete layout, native controls/materials, and exact current-version visual comparison remain open. This pass is not a one-to-one completion claim.

## Shared control metrics from installed styles

Read-only inspection of `D4qqfDv_.js.decoded` identifies the current app's global reset (`Lwe`), button holder (`Button__UIHolder`), and box metrics (`Aie`). The body uses 13px/450 with a 16px line box (16/13 em). Small text controls use 32px height and 12px horizontal padding; the common control radius resolves to 6px. Button lettering is -0.01863636em and control-copy line height is 1.33. Refract already had matching base font size/weight and small-control height, but used normal body line height, 8px text-button padding, 5px corners and default letter spacing.

Those differences are now corrected through shared tokens and Button styling. Existing icon-specific padding remains separate. Production compilation, isolated editor interaction checks and native crop checks passed; the resulting dark editor capture was visually inspected for control/text clipping. This is source-backed metric alignment, not a current-version full-window pixel-match claim. Responsive typography overrides in the reference were observed but not applied without resolving their active conditions.

## Selected-item sidebar navigation

The installed `SidebarNavigation` render branch puts a labeled Close Zoom/Mask/Slice editor control before selected-item content. Its opened-item group uses a 3px gap. Refract's zoom, mask and clip panes instead had a small X beside the heading. They now use a labeled close row before the pane heading, retaining the current root settings panel when the selection closes.

The production editor verifier exercises closing the zoom pane, confirms the background panel returns and the zoom remains on the timeline. The other interaction checks and production build pass. This establishes navigation behavior, not exact reference icon styling or full-pane visual parity. The same pass restores the zoom-mode selector's original styles after discovering the prior background-selector change had unintentionally reached that branch as well.

## Wallpaper sample states from current component

The installed `Du1ndVwJ.js.decoded` contains `PictureSample__UIHolder`: its size expression resolves to 32px, with a 1px outline at 1px offset, 40% text-color hover outline, 80% selected outline, and a white 1px border blended over the image. This confirms the earlier size choice independently of the guide image. Refract now uses that edge/outline structure and suppresses scale-on-press for these fixed-size samples. The selected sample carries aria-pressed and clicking it does not generate another edit. Theme-aware semantic tokens provide outline colors.

The resulting dark editor capture was inspected; production editor interaction checks and build passed. Categories, favourites, wallpaper artwork and a same-state reference pixel comparison remain incomplete. This change addresses sample chrome only.

## Shared settings sliders

Read-only decoding of `dIDR4zos.js` exposes the installed `SliderPicker` component. Its default kind is primary; SliderRoot is 20px high, SliderTrack/SliderRange are 3px high and expand to 5px on hover, and SliderThumb is 20×20px. Refract's settings previously used an unfilled 4px track and a 12px white thumb. Shared Range controls now use the reference geometry, primary fill, and theme-aware colored thumbs, with reduced-motion overrides. Native range input semantics and editable numeric values remain functional. Timeline zoom sliders are outside this scoped styling.

Production build and the isolated editor checks pass, including exact numeric trim entry and gesture interactions. The dark renderer capture was inspected and light capture was generated. Actual reset-row placement, hover value preview, full keyboard/focus visual comparison and exact color-transfer behavior remain outstanding. The primary color remains the user's chosen teal rather than the reference purple.

## Slider reset-row placement

The inspected `SliderPicker` renders its reset button in the slider's horizontal form, using toolbar size and disabling it when value equals resetValue. Shared Refract Range controls now place Reset beside the track rather than beside the label, with a 38px control height and explicit disabled-at-default behavior. Numeric entry stays available above the track; exact reference value-preview placement remains open.

Production build and isolated editor checks pass. The verifier changes Padding from 10 to 18 through real numeric entry, confirms Reset becomes enabled and is horizontally adjacent/vertically centered on the slider, then verifies it restores 10 and disables again. The resulting light-theme screenshot was inspected. This is a shared row-layout correction, not full-panel visual parity.

## Editor tool rail — 2026-09-09

Read-only inspection of the installed 3.7.5 editor's `RecordingTools` and
`RecordingEditor` declarations confirms that the tools are a vertical rail
between the preview and the 340px settings panel, inside the preview/playback
column. The earlier horizontal settings-panel header was incorrect.

Moved the seven existing tool actions into that rail, with 16px icons, 12px
padding (40px targets), 6px corner radii and a 4px active dot at right:5px.
The playback controls remain below the preview and rail; settings now start at
the panel's existing 32px top padding. Semantic theme colors preserve system
appearance and the explicitly requested teal accent. This is an independent
implementation of observed geometry; no reference assets or code are shipped.

This does not establish whole-window pixel parity. Reference SF Symbols,
capability-dependent tool availability, preview toolbar/transport geometry and
the wallpaper library still require matching. The decoded component declaration
was already available; an earlier search stopped at the string-table occurrence.

The same inspection confirms `ControlsBar` uses three equal grid columns. Applied
that structure to Refract's playback row so its central controls no longer shift
with the widths of the left and right groups; removed the extra top divider and
17px horizontal inset absent from that reference holder. Existing controls and
keyboard behavior remain available. Production build and the isolated editor
interaction verifier pass, with both system-theme captures generated.

## Playback group — 2026-09-09

Installed `PlayButtons` observations: skip targets are 46×38px; play is 56×38px
with a 24px icon; the button gap is 1px and surrounding readout gap is 2px.
Position and duration flank the buttons, and both disappear when the center
container is narrower than 400px. Clicking either copies its timestamp.

Added shared toolbar button sizes, moved the time readouts, and implemented the
400px container query plus timestamp copying. A separate visually hidden timer
keeps playback position exposed to assistive technology at compact widths.
The existing editor verifier now exercises narrow and wide views and a real
pointer click to copy the paused timestamp. Reference frame-based time formatting
is still distinct from Refract's hundredths formatting; this pass does not claim
complete time-display or transport parity.

## Playback speed control — 2026-09-09

The installed `PlaybackSpeedPicker` is a transparent button, not a select.
Primary activation cycles 1× → 2× → 4× → 8× → 1×; from a slower value it returns
to 1×. Its context menu groups 0.25×/0.5× as Slower, 1× as Normal and 2×/4×/8×
as Faster. Replaced the dropdown with that behavior and added a grouped radio
menu. Arrow keys or Shift-F10 open it, arrows/Home/End move focus, Enter selects,
and Escape dismisses with trigger focus restored. The shared source and camera
preview rate updates continue to use the selected value.

This menu currently uses an HTML popover with semantic theme tokens. It does not
establish native macOS menu material parity. The isolated editor verification
covers all cycle transitions, selecting 0.25× using keyboard input, confirming
that rate on the real video element, returning to 1×, and context-menu dismissal.

## Preview performance panel — 2026-09-09

Installed `VideoPerformanceOptions` uses a transparent gauge toolbar button,
a 4px warning dot at top:5px/right:12px when quality or power is reduced,
and a panel with 320px content width. It contains Preview mode (Quality or
Performance), Power saving mode, and a preview-only explanation.

Replaced the exposed quality dropdown with that panel. Performance continues to
skip preview motion blur. Added a power-saving preview redraw cap of 30fps while
keeping media transport updates independent; paused edits still invalidate
immediately. The export rendering path does not read either preview setting.
The panel follows semantic theme tokens and Escape restores trigger focus.

Implementation difference: the reference requests a low-power WebGL context;
Refract's Canvas implementation limits redraw frequency instead. This reduces
rendering work but is not evidence of equivalent power consumption. The verifier
checks option state, warning-dot reset, keyboard dismissal, and counts actual
composition clears over 650ms of playback (2–23 allowed), while checking media
continues advancing. Native popover material and exact segmented-choice styling
remain unverified.

## Frame-based playback timestamps — 2026-09-09

Read-only inspection of the installed playback formatter confirms fractional
fields represent frames, not hundredths. Short recordings use m:ss.ff; recordings
at least ten minutes pad minutes to mm:ss.ff. Frames hide during playback except
in the reference's hour-format branch (selected when total duration exceeds one
hour). Copy actions retain frame precision.

Added a dedicated formatter and applied it to the two visible playback readouts
and copy actions. The preview uses a 60fps timebase, matching the installed
editor's explicit preview configuration. Clip editing and the assistive playback
timer retain millisecond-based values. Tests cover 24/30/60fps, the second boundary,
duration-dependent padding, playback formatting, and invalid inputs. The unusual
strictly-greater-than-one-hour branch follows the observed formatter.

## Named output aspect ratios — 2026-09-09

Installed `AspectRatioPicker` uses a transparent toolbar trigger, shape previews,
named options, and numeric ratio descriptions. The option order is Auto, Wide
(16:9), Square (1:1), Classic (4:3), Vertical (9:16), Tall (3:4), Portrait (4:5).
Selection keeps the picker open. Refract previously exposed a bordered native
select with numeric labels and omitted Tall.

Implemented those names, order, proportional shape previews, persistent selection,
keyboard navigation/activation, and Escape focus restoration. A legacy ratio
outside the reference list remains visible as Custom when opening an existing
project. The verifier selects Tall with Enter, checks the real composition ratio,
checks that the picker remains open, and restores Auto with one Undo.

The reference's conditional “Always keep zoomed in” option for vertical outputs
was missing in this pass and was subsequently implemented; see
`../research/vertical-framing.md` for behavior and remaining geometry differences.
Popup material and exact option-row dimensions have not been visually matched.

## Shared advanced-field disclosures — 2026-09-09

The installed app was raised and inspected again through CUA. Its accessibility
hierarchy remains readable, but the screenshot still returns white; a direct
pixel comparison is not available from that capture.

Read-only inspection of shared `NamedField` confirms togglable headers use a
full-width label row, a small right-side chevron, 1px content gap, and a 200ms
vertical flip when expanded. Collapsed contents are unmounted. Added a shared
Disclosure component and used it for advanced shadows, motion blur, and spring
controls, replacing the browser's default details triangle. Native buttons expose
expanded state and content association; reduced motion removes chevron animation.
The editor verifier exercises Space activation, ensures playback stays paused,
and confirms collapsed fields are removed.

This matches the observed disclosure structure, not verified whole-app pixels.

## Missing-track tools and packaged launch — 2026-09-09

Read-only inspection of the reference RecordingTools component confirms missing
cursor, camera, and shortcut tracks disable their buttons with 0.3 opacity and
specific tooltip explanations. Refract now applies these states to its tool rail
and excludes the same unavailable actions from keyboard commands. Disabled tools
do not display an active indicator or hover fill. Audio and captions remain
reachable because Refract currently places media import actions in those panels;
this is a remaining workflow difference from the reference.

The production editor verifier checks missing-track button states, explanations,
and computed opacity using an imported video with no input or camera tracks.

Built both Swift helpers and the production renderer, then packaged Electron
44.3.0 for arm64. CUA confirmed Refract was not running before opening the package
at `release/current-verification/Refract-darwin-arm64/Refract.app`. Its accessibility
tree confirms the recorder route, drag handle, capture modes, camera, microphone,
system audio, and options controls loaded. After the tool-availability check passed,
quit the idle recorder and refreshed the package. Its renderer assets and main
process were compared byte-for-byte with the current production build. CUA screenshots remain blank even when accessibility
works, so launch verification is not a claim of pixel equality. Full Screen Studio
parity is still incomplete.

The reference tool rail also specifies left-side tooltips. Refract now uses a
shared descriptive popover on that side, including disabled-track explanations.
Native pointer verification checks its placement, lack of focus stealing, and
Escape dismissal without clearing the selected clip. Exact reference tooltip
colors, dimensions, and delay are unverified; the current 400ms hover delay is
provisional. Source inspection does not show an expanding label in the rail itself.

## Recorder input menus and toolbar redraw — 2026-09-09

Live Screen Studio accessibility inspection confirms audio and microphone choices
are native macOS menus. Refract previously resized its transparent recorder window
from 64px to 404px and rendered a loading panel for these input choices. Camera,
microphone, and system audio now use Electron native menus through the production
preload bridge. They preserve the compact window, avoid the source-loading panel,
and no longer shrink their button on press. Repeated requests are guarded while a
menu is pending. Identical recorder bounds no longer call native setBounds.

`verify-recorder-menus.cts` loads the production main process and preload in an
isolated profile. It sends mouse input, opens the real native menu, invokes its
selection callback, and closes it through Electron. It checks cancellation,
selection propagation, the original toolbar/button DOM identities, and zero native
resize events. The automation waits 1.2 seconds between programmatic NSMenu closes;
rapid programmatic reopen at 200ms did not reliably produce a second native menu.
This is not evidence of rapid real-mouse menu switching or exact visual parity.

The reference's per-application system audio, microphone normalization, and gain
controls remain missing. Camera/microphone device choices use the capture helper;
the automated native-menu test exercises system audio only. API behavior follows
[Electron's native menu documentation](https://www.electronjs.org/docs/latest/api/menu).

## Recorder source-refresh stability — 2026-09-09

Display, Window, Area, and Settings used to replace cached panel controls with a
loading message on every source scan. Rapid switching could launch duplicate
scans whose results arrived in a different order. Recorder refresh now shares an
in-flight request and keeps cached controls mounted until updated devices arrive.
The initial scan still shows loading when no source information exists.

`verify-recorder-refresh.cts` drives the production renderer with a deliberately
delayed source-provider fixture. It checks overlapping requests are coalesced,
cached display/settings controls stay visible, changed display dimensions appear,
and both toolbar buttons and the settings field retain DOM identity. This verifies
renderer behavior, not native window compositing or physical device enumeration.
The live packaged-app click check remains pending while the Mac is locked.

## Recorder control dimensions — 2026-09-09

Read-only inspection of the installed recording-picker bundle confirms mode
buttons are 56×50px, with 22px icons, a 0.75px icon-label gap, 10px labels with
line-height 1 and a -2px bottom margin. Camera and microphone controls reserve
126px and 146px respectively. Shared large controls are 40px high with 14px
horizontal padding; input icons use the 16px control-icon size. Applied these
dimensions, inactive input text at 50% opacity with full text color on hover,
and fixed-width ellipsis for device names. Removed extra horizontal separator
margins and per-button gaps that consumed the compact bar's available width.

The delayed-source verifier now also selects deliberately long device names via
a fixture menu response and checks all toolbar controls retain their x positions
and widths and remain within the window. Inspected its captured toolbar image.
This establishes stable renderer geometry; reference material, SF Symbols, and
live native compositing remain unverified.

## Camera resolution menu — 2026-09-09

The reference camera picker includes a native “Max camera resolution” submenu.
Moved Refract's existing 720p/1080p/4K preference into that menu and removed the
duplicate segmented control from general recording settings. A resolution choice
returns a distinct typed result, preserving the selected camera rather than
treating the resolution as a device ID. The preference uses the existing saved
setting and capture configuration.

`verify-recorder-menus.cts --camera` opens the native menu through the production
bridge, invokes the 4K submenu callback, verifies persisted 2160, verifies camera
selection is unchanged, and checks toolbar identity and zero native resizes.
This verifies menu integration; it does not prove a physical camera delivered
4K frames. Reference camera-preview visibility controls remain missing.

## Recorder menu input methods — 2026-09-09

The reference camera control opens its native menu from both click and context
menu actions. Refract's camera, microphone, and system-audio controls now support
right-click as well as primary click. Arrow Down, the context-menu key, and
Shift-F10 also open the menu from a focused control; Enter and Space keep native
button activation. Repeated/composing keys and unrelated command chords are ignored.

The production native-menu verifier now uses actual Electron right-button events,
Down-key events, and left-button events across cancellation and selection cycles.
Camera resolution selection passes through this path with unchanged camera input,
toolbar identity, and native bounds. This does not replace the pending live
comparison with Screen Studio on the unlocked Mac.

The system-audio variant also passes cancellation and selection through these
input methods. One initial right-click attempt did not open a menu; a diagnostic
rerun passed. The verifier now explicitly waits for document focus and two frames
before sending input, and that run passed too. Live comparison is still needed
to distinguish any remaining native interaction issues from automation timing.

## Recording countdown choices — 2026-09-09

The reference's recording options offer No countdown, 3s, 5s, and 10s. Refract
now saves these choices and sends the selected duration with the capture request.
Older requests retain the three-second default. Zero goes directly to starting;
positive durations use a monotonic deadline and only update the displayed count
when the remaining second changes. A delayed event-loop tick therefore catches
up instead of extending the countdown. Existing cancel behavior clears the timer.

All 150 core tests pass, including duration normalization and delayed-tick math.
The recorder renderer verifier chooses No countdown, checks persistence and the
updated display-source hint, and verifies the intercepted capture request carries
zero. It does not start a real recording. Live start/cancel timing and native
recording-options menu presentation remain unverified; the current control lives
in Refract's recording settings panel.

## Native recording-options menu — 2026-09-09

The toolbar's options button now opens a native menu rather than expanding the
transparent recorder window. Supported quick actions include the countdown
submenu, automatic zoom creation, and after-recording behavior. Typed responses
update the existing persisted settings. The remaining panel is available through
an explicit “Recording settings…” action; opening that panel is the only action
in this menu intended to expand the recorder.

The production native-menu verifier's `--settings` path checks right-click,
keyboard, and primary-click access; cancellation; persisted countdown, automatic
zoom, and export-file choices; unchanged toolbar DOM; and zero native resizes.
The renderer refresh verifier still passes through the explicit panel path.
This is a partial menu match: desktop-icon hiding, the quick-share widget, dock
visibility, recorded-area highlighting, and the reference's Advanced structure
remain absent. Exact live menu placement/material comparison awaits unlock.

## Capture-only desktop-icon option and resumed live checks — 2026-09-09

Added the reference's “Hide desktop icons in recorded video” native-menu option,
persisted its value, and forwarded it to the Swift capture configuration. For
display/area capture, the existing app-exclusion filter now excepts Finder windows
at the CoreGraphics desktop-icon level. It does not modify Finder preferences,
hide ordinary Finder windows, or replace the desktop wallpaper. Single-window
capture retains its existing filter. The default remains off for older settings.

The implementation uses Apple's documented exception semantics for
[SCContentFilter](https://developer.apple.com/documentation/screencapturekit/sccontentfilter/init(display:excludingapplications:exceptingwindows:))
and its [desktop-icon window level](https://developer.apple.com/documentation/coregraphics/cgwindowlevelkey/desktopiconwindow).
Both native helpers and the application build pass. A Swift classification check
excludes only the intended app/layer combination. Native-menu persistence and the
renderer-to-capture request checks pass. Once the Mac became accessible, a
read-only SCShareableContent inspection found one matching Finder window at layer
-2147483603. Recorded-pixel verification remains pending, as does behavior if
Finder recreates its desktop window during an active recording.

Opened the fresh package at `release/camera-menu/Refract-darwin-arm64/Refract.app`
after confirming Refract was not running. CUA now returns visible toolbar images.
Opening and cancelling Recording options showed the native menu and returned to
the compact bar. The reference recording bar is also visible again: its close
button placement, group spacing, and SF Symbol shapes still differ. It rendered
dark while Refract followed the system's light theme. Full visual parity is not
claimed, and the user's earlier deliberate theme/accent preferences still apply.

## Recorder spacing scale and native Swift glass — 2026-09-09

Corrected the reference layout-helper interpretation: its spacing scale is
`4 * 2^n`, rounded to a tenth of a point. Thus the mode/input group gap is 4px,
the outer groups use 8px, and the mode icon/label gap is 6.7px. Earlier notes
calling that last gap 0.75px were incorrect. Removed the extra visible drag grip;
the remaining bar surface keeps its native drag region. The production renderer
check passes with long camera/microphone names and unchanged control geometry.

After the user confirmed the redraw issue was resolved, they requested a less
see-through, properly blurred native background. CSS backdrop-filter cannot
sample the desktop outside an Electron window. Added an original Swift Node-API
addon that places an AppKit material behind the HTML controls: regular
`NSGlassEffectView` on macOS 26+, with `NSVisualEffectView` behind-window material
on older supported macOS. The material is installed once, pinned to the bottom
64px through window expansion, and does not intercept clicks or dragging.
System appearance is inherited. HTML transparency is enabled only after a
successful native install; its simulated blur, gradient, border, and shadow are
then removed so they do not obscure the native material.

References: Apple's [NSGlassEffectView content contract](https://developer.apple.com/documentation/appkit/nsglasseffectview/contentview)
and Electron's [native window handle API](https://www.electronjs.org/docs/latest/api/base-window).
The Swift bridge compiles against the installed AppKit SDK, and uses the stable
Node-API C ABI without a V8/Electron-version-specific native dependency.

Application build and native settings-menu regression pass with the Swift addon
loaded and CSS backdrop-filter disabled. Repeated native menu opening, selection,
and cancellation preserve toolbar/control DOM identity with zero window resizes.
The older-macOS material branch still requires testing on that OS version.

Opened the rebuilt package and visually inspected the toolbar. Its live renderer
URL contains `nativeGlass=1`; the old visible grip is absent and the native light
material sits behind the controls. All 150 core tests pass. This confirms the
current macOS 26 integration, not full Screen Studio visual parity.

## Shared hover surfaces — 2026-09-09

Inspected the reference's recording-mode button and shared hover treatment. The
animated element is a decorative background, separate from the label/icon. It
scales from 0.8 to 1, follows the pointer by up to 2px on each axis, and escapes
outward while fading on leave. The observed spring configuration uses stiffness
1500, damping 100, and mass 2; a press reduces the background's longest dimension
by 2px. These measurements informed a new original TypeScript implementation.

Added one shared delegated hover controller for ordinary action buttons across
recorder, editor, transport, and dialogs. Motion values are centralized; animation
writes only decorative CSS variables and does not update React state. Existing
filled/selected colors stay intact. Timeline handles, switches, wallpaper swatches,
and menu rows keep their existing interaction treatment. Disabled buttons stay
quiet and reduced motion uses a static highlight. No vendor implementation or
assets were copied into the repository.

The production-renderer hover verifier passes scale-in, pointer following,
stationary button/glyph bounds, held-press release, fade-out, disabled controls,
and reduced motion. It uses an unthrottled hidden Electron window to avoid the
shared desktop's focus changes corrupting timing measurements. A focus-loss edge
case was corrected: subsequent pointer movement or a press reactivates the fill.
The full editor playback/keyboard verifier also passes. Its ratio Escape check now
waits for native key delivery and focus restoration instead of asserting before
the asynchronous key event arrives.

## Native recorder symbols and optical sizing — 2026-09-09

Replaced the recorder's approximate toolbar glyphs with runtime AppKit system
symbols: dock.rectangle, macwindow, square.dashed, apps.iphone, video/video.slash,
microphone.fill/microphone.slash.fill, music.note.tv, gear, chevron.down, and
xmark.circle.fill. The names were checked against the installed reference's
recorder UI. Older system naming falls back from microphone to mic. The Swift
addon renders the installed system glyphs; no reference assets are redistributed.

Each 22pt glyph is drawn in a 48pt transparent canvas at 3x resolution. The React
mask preserves that ratio at its requested point size and follows currentColor,
including inactive, hover, and light/dark theme colors. It keeps the existing
button and icon layout slots. An initial implementation normalized every glyph to
a square; live side-by-side inspection showed that made wide symbols too small.
The corrected rendering preserves AppKit's natural glyph metrics. The close
control's horizontal margin increased by 1px per side to align the mode group
with the reference while keeping its hit target and drag regions stable.

The application/Swift build passes. The native-menu verifier validates all 12
144px alpha masks, their transparent and nonempty pixels, and all ten visible
native glyphs in the toolbar. Repeated menu selection/cancellation preserves DOM
identity and performs zero native resizes. The renderer refresh check also passes
with long camera/microphone labels. Screenshots and live reference comparison were
used for optical sizing; full-app visual parity remains unproven.

## Native source context menus — 2026-09-09

Added the reference's secondary-click menus on Display and Window. Down-arrow,
Shift-F10, and the context-menu key open the same native menus. Window entries
group by application path: one-window applications select directly from their
application name, while applications with multiple windows get title submenus.
The current selected target is checked. Display entries use NSScreen's real
localized display names; those names also replace generic numbering in the
existing display list. Swift source metadata now includes application paths so
separate apps with the same display name do not merge into one group.

Cancellation leaves the existing toolbar and panel untouched. Choosing an entry
prepares a target and focuses an explicit Record action; it does not start capture.
The native reference shows full-screen source highlighting at this step, whereas
Refract currently shows its existing panel shell with the chosen source and Record
action. That overlay mismatch remains open; the new native menu is not evidence
of complete picker parity. Primary-click source selection retains its existing
behavior. Native menu requests share a guard with the input menus, and a source
scan that finishes after recording starts cannot open a stale menu.

All 152 core tests pass, including app-identity grouping, checked selection,
permission denial, and empty sources. Native helpers and application build pass.
A production Electron check exercised real secondary-click/keyboard menus,
cancellation, target selection, unchanged toolbar identity, and the idle recording
state after selection. The renderer capture-request check confirms the selected
window ID and recording preferences only get sent after the explicit Record
button is activated; it uses a capture stub and does not record desktop content.

## Full-display selection overlay — 2026-09-09

Inspected the live reference's Display action without starting capture. It opens
one transparent full-display window per screen, with centered display name,
logical resolution, refresh rate, and Start recording action. Its cover combines
40% black with a 25% active accent tint. Read-only reference inspection confirmed
the separate per-display window structure and target-info layout.

Refract now follows that structure for primary Display selection and Display
context-menu choices. Each screen gets its own frameless overlay; the recorder
stays above those windows and does not expand into a list. The display label,
logical bounds, and refresh rate come from Electron's native screen inventory.
The overlay uses the intentionally selected teal accent. Escape closes the
picker. Clicking the background focuses its explicit Start action. Selecting a
display closes every overlay before handing its ID to the existing recording
flow, preserving countdown and input preferences. Closing/importing from the
recorder also cancels pending overlays. Generation checks prevent completed picker promises from overwriting a newer
mode selection.

Application build passes. The dedicated Electron verifier checks every connected
display's full bounds, transparent renderer background, Escape cancellation,
selection results, and complete window cleanup before resolution. A renderer
fixture confirms no capture request before acceptance, no list expansion for
Display, cancellation when switching to Window, and forwarding the accepted
display ID. Capture is stubbed in this test; it does not record the desktop.
The first lifecycle run caught premature promise resolution before native window
closure; the implementation now waits for all `closed` events.

This replaces the display confirmation panel noted in the previous section.
The reference's Start-button dropdown, richer selection feedback across multiple
displays, and its window-highlighting picker remain open work. No full picker or
application parity claim is made.

A packaged-app check exposed an unnecessary capture-permission gate in display
selection. Display overlays and display context menus now use native monitor
inventory directly, without calling the capture helper. Actual screen capture
continues to require the system permission; window-source listing still does too.

### Full-display countdown and shared native recorder panels — 2026-09-09

- Countdown now opens a transparent, frameless full-display window with a dimmed desktop, large centered remaining seconds, and Escape/Cancel. Display/area recordings use the selected display; selections without a display ID use the display under the pointer.
- The main process remains the countdown clock. Timing begins after the overlay loads; the existing monotonic deadline handles delayed ticks. The overlay closes completely before capture starts. Zero-second countdowns bypass it.
- Recorder popovers (including errors and advanced settings) now report their geometry to the existing Swift addon. A separate non-interactive `NSGlassEffectView` uses the same regular material and 19-point radius as the toolbar. Older macOS versions retain the AppKit HUD material fallback. Web chrome becomes transparent only after native installation succeeds.
- Error state hydration and a nonempty fallback prevent a heading-only error panel. This does not claim to resolve the underlying capture error or Screen Recording authorization.
- Verification: TypeScript/renderer build, Swift native build, 152 core tests, native countdown/glass fixture (full display bounds, ticks, Escape, completion cleanup, native panel installation, invalid geometry rejection, error fallback), and display-picker renderer handoff/cancellation regression passed. Capture was not started by these fixtures.
- Packaged display selection was also verified to open without requiring Screen Recording access. The packaged app still needs its own macOS capture authorization for an actual end-to-end recording test. Exact Screen Studio countdown motion and multi-monitor window targeting remain parity work.

### Display-picker completion menu — 2026-09-09

- Inspected Screen Studio's live full-display picker through Record → Record display. The separate arrow beside Start recording opens an AppKit menu with completion destinations and automatic zooms. Dismissed the reference picker without starting capture.
- Added the split button and native options menu to Refract's display picker. Create project, export to file, and automatic zooms use the existing completion pipeline. Clipboard export/share links remain visibly disabled pending those workflows; quick-export settings are not yet exposed in this menu.
- Menu selection persists the recorder preferences. The already-open recorder subscribes to cross-window storage changes, so the next capture uses the selected completion action and zoom preference. ArrowDown opens the menu; opening it does not select the display or start capture.
- Increased the centered display title from 28 to 32 points based on the earlier live size comparison. The user-selected teal tint remains deliberate.
- Verification: production build and native picker verifier passed, including menu clicks, ArrowDown, checked state, persistence, real cross-window preference delivery to a mounted recorder, captured request values, mode-switch cancellation, and window cleanup. The capture endpoint in the verifier is a stub; no desktop recording was started.
- Final live visual comparison is pending because the Mac locked during this turn.

### Quick-export settings entry point — 2026-09-09

- Read-only reference inspection confirmed that the picker menu's Quick export settings action opens the reference's widget settings section.
- Added the corresponding native menu action in Refract. It returns a typed settings destination from the picker, waits for the picker windows to close, and opens the recorder's native-glass quick-export panel without starting capture.
- Resolution and frame-rate controls are shared with the existing advanced recording settings. Changes persist in the same completion preference and feed the established MP4 export pipeline. Done receives initial keyboard focus; Escape closes the panel through the recorder's existing shortcut handling.
- Production build and the extended native verifier passed: native settings action, all picker windows closed before handoff, no capture on settings navigation, editable/persisted resolution, focused Done, return to recording, and cross-window completion/zoom preferences reaching the capture request.
- The verifier now imports the shared result type; its compiled entry point is `work/display-picker-runner/scripts/verify-display-picker.cjs`. The new verifier was run at that path and reported the quickExport checks explicitly.
- Live appearance remains unverified while the Mac is locked. Refract currently exposes a focused recorder panel rather than the reference's full settings section; broader settings layout parity remains open.

### Quick-export encoding matrix — 2026-09-09

- Extended the recording-completion verifier from a single 720px/24fps case to all 15 quick-export combinations: long-edge sizes 720, 1080, 1920, 2560, 3840 and frame rates 24, 30, 60.
- Each case delivers a synthetic recording-finished event to the production renderer, renders the video frames, streams them through production `writeEncoderFrame`, uses production `exportArgs` and `waitForEncoderFinalization`, and probes the actual MP4.
- All 15 passed H.264 codec, expected dimensions, frame count, frame rate, duration, and absence of invented audio streams. Machine-readable results are in `quick-export-matrix.json`. At 30fps, the quarter-second fixture rounds up to eight frames (0.266667 seconds), as expected.
- Retained checks for duplicate completion suppression, destination cancellation, and create-project avoiding export. The fixture now disables hidden-window throttling and explicitly preserves a nonzero exit status on failure.
- The initial synchronous PNG batch fixture stalled on the first larger case. Confirmed and stopped its idle encoder, then replaced that test-only path with production streaming. The corrected full matrix completed successfully. This was a verifier change; no application encoding change was required.
- Scope limits: synthetic silent footage, short durations, normal-speed clips. This does not prove long recordings, captured audio synchronization, permissions, or visual parity with Screen Studio.

### Countdown attempt isolation — 2026-09-09

- Found a startup race in the full-display countdown: a completed countdown waited for overlay closure, then checked only `phase === countdown`. Cancelling and starting a new countdown during that wait could let the old source start recording.
- Each recording countdown now has an attempt generation. Timer ticks, overlay readiness, load failures, and the final capture handoff must belong to the current attempt. Cancellation/failure invalidate it; quitting or closing the recorder also cancels a pending countdown.
- The overlay manager separately invalidates pending opens, including the microtask gap before window creation. Immediate close and superseding opens no longer create stale or duplicate fullscreen windows.
- Verified against the production recorder state machine with only the overlay and capture process stubbed: finish old countdown, cancel it, start a new source, release old window closure, assert no capture, release current closure, assert exactly the new source reaches the capture request. Quit cancellation also passed. No real capture process was launched.
- Native overlay regression passed immediate cancellation, concurrent opens, full-display bounds, live ticks, Escape, close-before-capture lifecycle, and native panel glass checks. Builds passed. Live reference appearance remains a separate pending check.

### Recorder error recovery — 2026-09-09

- Fixed a recovery dead end: the former Try again action refreshed sources but left the error panel open after success. Renamed it Check again to describe the action accurately; it does not silently restart a recording.
- Recovery now closes a resolved error, routes missing screen access to the existing permission instructions, and retains a useful new message when checking sources fails. When access becomes granted, the permission panel closes instead of leaving an empty heading.
- Closing or changing panels invalidates pending recovery, preventing a late result from reopening a dismissed error. The recovery action receives initial keyboard focus and shows a disabled Checking state while pending.
- Production build and a new renderer recovery verifier passed missing-permission handling, successful dismissal, failed checks, Escape during a pending check, and zero capture requests. Existing recorder-refresh regression also passed scan coalescing, cached controls, updated device data, and stable toolbar identity.
- These fixtures simulate source responses and do not grant macOS permissions or prove that a particular native capture failure is resolved.

### Window-picker geometry and countdown targeting — 2026-09-09

- Live inspection resumed after the Mac became accessible. The reference Window command activates its compact recorder; full pointer-hover behavior still needs direct comparison. Refract's existing list is not yet replaced by the overlay.
- Native window sources now include desktop bounds and front-to-back ordering from the on-screen Core Graphics window list. Existing app-window filtering is preserved. The metadata uses public [CGWindowListCopyWindowInfo](https://developer.apple.com/documentation/coregraphics/cgwindowlistcopywindowinfo(_:_:)) and [SCWindow.frame](https://developer.apple.com/documentation/screencapturekit/scwindow/frame).
- Added shared TypeScript geometry for topmost window hit testing and selecting the display with the greatest window intersection. Tests cover overlapping windows, source-array order independence, negative desktop coordinates, half-open edges, missing/invalid bounds, and windows spanning displays.
- Window capture now revalidates the target before countdown. Missing permission and vanished windows produce actionable errors; an available window supplies the correct display for the fullscreen countdown instead of using the pointer's screen.
- Swift and TypeScript builds passed; 155 core tests passed. The native helper returned seven live windows with valid geometry and ordered indices. Recorder state-machine checks passed window validation, permission rejection, display selection, and existing stale-countdown protection; actual capture remained stubbed.
- The visible window highlighting picker remains unfinished. Native metadata is ready for its integration; this change does not claim window-picker visual parity.

### Desktop window selection overlay — 2026-09-09

- Replaced the primary Window button's list with a full-display desktop picker. Native source context menus remain available through secondary click and keyboard menu commands.
- Read-only inspection of the reference SystemWindowPicker component confirmed separate selection and start callbacks, an 11-point highlight radius, and a 3-point selected outline. Refract now follows that two-step structure: hover identifies the frontmost window; click selects; Start recording confirms.
- One transparent overlay opens per display. Source geometry refreshes every 1.5 seconds with no overlapping scans; vanished selected windows are deselected. Tab/Shift-Tab select windows, Enter activates the focused Start button, and Escape cancels. Empty source lists offer Record entire display.
- Only known picker renderers can select or complete. Completion resolves after all overlays close; mode switches and stale initial scans cancel cleanly. The existing recording pipeline revalidates a chosen window before capture.
- Production build and native window-picker verifier passed full-display bounds, frontmost hover, two-step selection, source refresh, keyboard selection, cancellation, missing permission, overlay cleanup, and production recorder mode-switch/result handoff. Capture was stubbed in these tests.
- Packaged app opened the live picker and displayed the real ChatGPT window's bounds. It was subsequently dismissed; no successful live recording is claimed from this check.
- Remaining reference gaps: application icons, split-button completion menu inside the window highlight, window resize presets, crop suggestions, ignored-window controls, display context menu, and exact motion/material comparison. Geometry polling may need refinement for rapidly moving windows.

### Native application icons — 2026-09-09

- Added the reference's 96-point icon slot above the window title, with a fixed-size placeholder so loading does not move the controls.
- Swift renders the system application icon into a 288×288 PNG. The main process obtains application paths from native window sources, validates the picker sender/window ID, and caches up to 64 icons. No renderer-supplied file path is read.
- Native/renderer builds and the window-picker verifier passed 288px image dimensions, 96pt layout size, unknown-window rejection, and existing selection/handoff checks. The icon assertion runs after selecting the target to avoid interference from live pointer movement during an asynchronous hover load.

### Universal editor hover — 2026-09-09

- Removed exclusions for timeline controls, menus, command results, switches, and wallpaper swatches from the shared toolbar hover controller. Semantic button/menu/tab/option controls now receive the same spring-driven decorative fill, including controls mounted after opening panels and dialogs.
- Removed competing static hover backgrounds from shared buttons, toggles, and editor controls. Selected states retain their own colors; the hover fill uses the existing system-theme color token.
- Initialized motion properties on every surface so nested trim handles do not inherit their clip's hover. Labels, icons, and control bounds remain stationary.
- Production build passed. A synthetic-video Electron fixture verified spring entrance and settling on playback, wallpaper, timeline clip, playback menu, and preview switch controls, plus stable geometry and nested-control isolation. The toolbar regression passed pointer following, held-press release, reduced-motion behavior, and disabled controls.
- Native text inputs, selects, and slider thumbs retain their specialized interaction feedback. No recording was made during these checks.

### Shared window-picker completion menu — 2026-09-09

- Window selection now shows the same split Start recording button as display selection. Its native options menu supports Create project, Export and save to file, automatic zooms, and Quick export settings. Unsupported clipboard/share-link choices remain disabled.
- Extracted shared renderer actions and native menu lifecycle so both pickers use identical controls, saved preferences, keyboard entry, checked states, and popup positioning. Window selection is preserved when changing options. Tab can reach the options half of the split button.
- Quick export settings closes all window overlays before returning to the recorder settings panel; it never starts capture. IPC ownership checks remain scoped to each picker.
- Production build and both native picker verifiers passed. Window coverage includes persisted completion/zoom settings, selected-window preservation, settings cleanup and recorder handoff, existing icon/geometry checks, and stubbed recording handoff. Display coverage confirms its existing native menu and settings flow remains intact. No live recording was made.

### Inspector slider readouts and keyboard increments — 2026-09-09

- Inspected the installed NamedField and SliderPicker definitions. Named fields use an 8px label/content gap and copy typography. Slider previews, where enabled, sit 4px beneath the thumb, use a 200ms fade with a 200ms delay, and reveal on the whole slider row. Arrow-key adjustments use the larger of the step and one hundredth of the range, snapped to the configured step.
- Refract's shared ranges now use 13px labels, an 8px gap, and thumb-aligned contextual readouts instead of permanently placing numbers beside every label. Hovering Reset also reveals the slider feedback. Keyboard focus reveals the readout immediately; direct numeric entry remains available with Enter/Escape and focus restoration. The shared treatment includes ranges whose reference preview configuration still needs individual comparison.
- Production build and the synthetic inspector fixture passed idle/hover visibility, thumb alignment, stationary geometry, numeric commit/cancel, keyboard increments, reset, keyboard visibility, reduced motion, and dark-theme response. Inspected the rendered light-theme screenshot.
- The Mac locked during live Screen Studio inspection, so side-by-side runtime comparison and replacement of the running build remain pending unlock. No full visual-parity claim is made.

### Background inspector preview configuration — 2026-09-09

- Compared individual BackgroundStyleSettings slider arguments with the installed SliderPicker implementation. Padding, rounded corners, inset, and shadow angle request below-thumb previews; background blur, shadow intensity, distance, and blur omit that preview and retain above-thumb value tooltips.
- Added per-field preview placement to shared ranges and configured those background controls accordingly. Below-thumb previews respond to the full row; above-thumb values respond to the slider itself. Direct numeric entry and keyboard visibility remain available.
- Padding now uses the reference's 0.001 input step and one-decimal percent preview. Its arrow increment remains one hundredth of its 0–35 range (0.35), avoiding whole-number truncation.
- Build and inspector fixture passed above-thumb blur positioning, below-thumb padding formatting, fractional adjustment, stationary geometry, Enter/Escape, reset, reduced motion, and theme checks. Other inspector panels still require field-by-field configuration comparison.

### Inset and outer-corner behavior — 2026-09-09

- Installed inset controls span 0–60 with fractional input; changing inset sets the outer corner radius to rounded inset plus 12. The reference renderer subtracts the inset to derive video corners, retaining a four-point minimum when the outer radius is at least four.
- Added optional outerRadius appearance data for new edits. Existing projects without it keep the original inner-radius interpretation and render unchanged. Rounded corners now displays the outer frame radius; changing Inset sets both values in one undoable edit. Reset restores zero inset and a 12-point outer radius.
- Preview/export share the updated compositor; both video and cursor clipping use the derived inner radius. Project validation checks optional outer radii without requiring migration of older projects.
- All 159 core tests passed before the final compositor assertion; the focused 12-test compositor/corner suite then passed, including pixel equality for equivalent legacy/new settings and distinct video/frame corner changes. Inspector verification passed fractional edits, coupled radius changes, reset, Undo/Redo, and prior editing/hover checks.
- Asymmetric per-edge inset positioning, source-derived color suggestions, and live reference comparison remain open.

### Source-derived inset color suggestions — 2026-09-09

- Reopened the reference's recent 12-second project through its File menu. The editor accessibility tree is available, but its screenshot still returns blank; a pixel-perfect comparison remains unproven.
- Installed inset code samples two perimeter rings around the cropped frame, ranks colors by frequency, and shows up to 24 suggestions in a horizontal strip. Added independently implemented perimeter sampling and ranking to Refract, with 28px swatches, 4px spacing, and the custom color input retained.
- Sampling is debounced after source load, seek, crop change, and pause; it does not run continuously during playback. The source video is sampled before effects, respecting the current crop. Suggestions do not change the project until selected, and selections use ordinary undoable appearance edits.
- Build, color-ranking unit checks, and the synthetic inspector fixture passed. The editor produced suggestions, applied one, and restored the original color through Undo while prior inset/corner and keyboard checks remained green.
- Exact palette parity on identical decoded reference frames remains to be measured. Asymmetric inset positioning is still missing.

### Asymmetric inset balance — 2026-09-09

- Inspected the reference PointPositionPicker and inset redistribution logic. It uses a 16:9 grid, 24px draggable marker, 10px outer radius, normalized left/top proportions, center snapping within 0.01, and Reset. Native accessibility slider actions did not reliably alter the reference's inset, so this behavior evidence comes from installed definitions.
- Added a collapsible Inset balance pad with pointer capture, release/cancel handling, center snapping, keyboard adjustment, and Reset. The drag readout floats above the pad without changing layout.
- Optional insetBalance project data redistributes the fixed inset total between opposing edges. Shared preview/export geometry shifts the video within a stationary outer frame; cursor/mask geometry and preview targeting follow it. Old projects default to centered balance. Project validation rejects out-of-range balance coordinates.
- Production build and focused compositor/balance tests passed default compatibility, edge totals, snapping, frame invariance, hit testing, round trip, and validation. The editor fixture passed keyboard movement, a pointer drag to a new position, Reset, and prior inset/color checks. Exact reference motion and live side-by-side pixel comparison remain open.
- Inset opacity remains a separate missing control.

### Inset opacity — 2026-09-09

- Added the reference's Inset opacity control beneath inset colors, with a 0–1 range, 0.001 precision, and above-thumb numeric feedback. It appears while inset is enabled.
- Optional insetOpacity data defaults to one for existing projects. The shared preview/export compositor blends inset color independently of video content and draws the outside shadow at its existing strength. Validation rejects non-finite and out-of-range opacity.
- Production build and 15 focused compositor/project tests passed. Pixel checks at opacity zero, one-half, and one verify inset blending, opaque video, and identical outside shadow samples. Persistence/invalid-input checks and the full inspector fixture passed fractional entry, Undo, and existing inset balance/color interactions.
- These tests establish implementation behavior; reference pixel comparison at translucent inset boundaries remains outstanding.

### Custom gradient rendering correction — 2026-09-09

- Installed background controls define custom gradients with two endpoint colors, from normalized (0,0) to (1,1). My initial assumption about explicit direction/swap controls was not supported by this module; it exposes color inputs and a preset gallery.
- Corrected Refract's custom gradient, which previously used three stops and repeated the starting color at the far end, on the opposite diagonal. Preview/export now interpolate between the two chosen colors along the reference diagonal. Wallpaper rendering retains its separate artwork treatment.
- Color inputs now sit below Background Color/Background Gradient labels with an 8px gap. Existing custom-gradient projects receive the corrected appearance; their saved colors remain unchanged.
- Production build and all 10 compositor tests passed, including endpoint and intermediate-pixel assertions in landscape and portrait output. The reference gradient preset gallery remains missing.

### Gradient preset gallery — 2026-09-09

- Added the 69 gradient color configurations identified in installed preset data. The first twenty pair a base color with an HSL-lightness increase of twenty points; the remainder contain explicit multi-color palettes. Only functional color values are included, with independently implemented UI and rendering.
- Added an initially open Gradient presets section with six columns of 32px swatches, 8px gaps, a 180px scroll region, selected outlines, and shared hover feedback. Selecting a preset updates both endpoint inputs and retains all intermediate colors. Editing either endpoint returns to a two-stop custom gradient, matching the inspected reference handler.
- Optional gradientStops appearance data persists the full palette. Preview/export place stops at evenly spaced positions along the existing top-left/bottom-right axis. Validation rejects malformed palettes.
- Build and thirteen focused compositor/preset tests passed all preset round trips, malformed input, two-color fallback, and multi-stop pixel interpolation. The editor fixture passed 69 visible DOM entries, selection, endpoint values, manual customization, and Undo restoring preset selection.
- Live reference color/pixel comparison, especially rounding of generated lightened colors, remains unverified.

### Background image picker — 2026-09-09

- Replaced the plain browse button with a reference-style image card: preview, photo icon, browse/drop/paste instructions, and a blurred instruction overlay over the selected image.
- Browsing, dropping, and pasting an image while hovering/focusing the card share one decode-before-apply path. Invalid images preserve the existing background and report an inline error. Pending reads are invalidated when the picker unmounts; project IDs key the picker to prevent cross-project completion. File input resets after selection so the same file can be chosen again.
- Paste handling ignores text inputs and editable content. It processes only the image attached to the user's paste event, without proactively reading the clipboard.
- Production build and inspector fixture passed image drop, synthetic image paste, preview dimensions, composition background pixels, invalid-image recovery, and Undo. The fixture uses generated image bytes and does not read the user's clipboard.
- The existing data-URL persistence path is retained; large-image memory/performance and exact live reference appearance still need comparison.

### Editor hover consistency follow-up — 2026-09-09

- Removed the disclosure chevron's independent static highlight and the duplicate hover fills in aspect-ratio and playback-speed menus. Disclosure headers now have the shared control radius and spring background.
- Expanded shared hover enrollment to semantic switches, checkboxes, radios, links, and disclosure summaries, including non-button implementations.
- Production build passed. The synthetic Electron editor fixture passed spring entrance/settling and stationary bounds for playback, disclosure headers, wallpaper swatches, timeline clips, playback menus, and switches. Nested trim controls remained isolated, and the disclosure chevron no longer painted a second hover background. The fixture scrolls inspector controls into view before pointer checks.

### Background image aspect-ratio fitting — 2026-09-09

- Read-only inspection of the installed reference renderer found a maximum width/height scale with centered offsets for image backgrounds (`MG`, used by `py`). Refract previously stretched images independently on each axis.
- The shared preview/export compositor now center-covers images using intrinsic dimensions, preserving proportions across output ratios. Existing blur overscan remains; exact reference blur/filter matching is not established by this change.
- Production build and all 12 compositor tests passed. A distinctive banded image verifies the expected cropped corner in landscape and portrait outputs and the original corner in square output. The real Electron inspector fixture also passed image drop/paste rendering, invalid-image retention, Undo, and its existing inspector checks. No live desktop capture was used.

### Cached background filter — 2026-09-09

- Replaced the broad single Canvas blur with an independent WebGL2 separable five-tap implementation: 20 passes per axis, strength = output width × setting / 2000. Premultiplied pixels are filtered in reusable RGBA buffers.
- Backgrounds are painted with fixed centered-cover geometry into padded surfaces. Blur no longer enlarges the image. The final background is cached by context, dimensions, setting, appearance values, and image identity; video/cursor/camera frames remain uncached and sharp.
- GPU-unavailable/oversized paths use a Gaussian approximation matched to the repeated kernel's modeled variance, including subpixel sampling. This fallback is explicitly approximate.
- Production build and all 173 core tests passed. Cache tests cover reuse and invalidation; a boundary test verifies fixed geometry. The Electron GPU fixture compared strengths 0/3/12/24 against an independent quantized CPU model: maximum interior channel error 1/255, mean below 0.084/255. Transparent red remained red after filtering (sample RGBA 255,0,0,57); texture resizing passed. The production editor fixture passed image blur and Undo plus existing inspector interactions.
- This establishes kernel implementation evidence, not complete reference-export parity. Exact framebuffer boundary behavior, filter resolution across displays, and large-export performance still require comparison to reference exports.

### GPU background export verification — 2026-09-09

- Created a fresh reference project through Screen Studio's File → Create project from video using `work/reference-fixture.mp4` (12 seconds, 1280×720 synthetic footage). Current reference project: `screen-studio-LB1QZDNkW6`; selected the generated banded PNG as its image background. Reference settings remain blur 0, padding 10, radius 12, inset 0, shadow 0.75.
- Clicking Export opens Screen Studio's activation screen. No reference export was obtained and no license gate was bypassed. Returned to the editor; its screenshot still appeared blank despite a populated accessibility tree. Requested user activation if a license is available. Direct reference-export parity remains unverified.
- Extended the GPU fixture to save independently rendered 1280×720 and 3840×2160 PNG frames. The encoder verifier uses production `exportArgs`, encodes three frames, probes dimensions/frame counts, decodes the first frame, and compares interior RGB samples with the GPU PNG. Transparent borders are excluded because these formats do not preserve full alpha.
- Passed 1280×720 MP4 (mean channel error 0.441/255, max 8), 1280×720 GIF (mean 0.041/255, max 6), and 3840×2160 MP4 (mean 0.394/255, max 6). All outputs contained three frames at the expected dimensions. Visually inspected the GPU PNG's band positions and orientation. This verifies GPU-frame encoding, not reference equivalence, long-export performance, or full editor capture/export orchestration.
- Reproduction: compile/run `scripts/verify-background-filter.cts` with `src/core/background-filter.ts` emitted to `work/background-filter`, then `node --import tsx scripts/verify-background-export.ts`. Fixture timing fields measure submission/draw time and are not a synchronized GPU performance benchmark.

### Wallpaper favorites — 2026-09-09

- Inspected the reference picker: favorites collection, checked “Add to favourites” context action, centered star indicator with 125ms opacity transition, and a random action sampling the full wallpaper library.
- Added a reusable WallpaperPicker with a favorites collection, persistent validated local preferences, cross-window storage synchronization, centered star feedback, and a context menu. Right-click and Shift–F10 open it; Enter activates, Escape dismisses, and focus returns to the swatch or collection selector when removing the last visible favorite. Random selection continues across the full available collection.
- Production build and synthetic Electron editor checks passed adding/removing favorites, stored IDs, collection filtering, keyboard activation/focus, and shared hover motion for the menu and existing editor controls. Inspected the rendered favorite indicator in the light-theme editor fixture.
- The available artwork remains Refract's eight generated wallpapers; the reference's full categories and image library are not reproduced by this change. Collection control presentation and reference pixel equivalence remain unverified.

### Shadow intensity control — 2026-09-09

- Reference inspector inspection confirmed a 0–1 Shadow range with no percent formatter. Its shared slider defaults to a 0.001 step; advanced distance/angle/blur ranges already match Refract's 0–100, 0–180, and 5–30 controls.
- Refract now exposes the stored 0–1 intensity directly, permits fractional entry, and displays the reference-scale value. Existing project data and compositor intensity are unchanged.
- Production build and Electron inspector fixture passed initial 0.75, Enter commit at 0.375, arrow adjustment to 0.385, reset to 0.75, and Undo after the normal 350ms appearance edit group closes. Existing inspector tests also passed.
- Shadow rendering remains a separate comparison: the reference creates/caches a shadow texture (`px`/`ZG`) and applies intensity to that sprite, while Refract uses Canvas shadow properties. No rendering-equivalence claim is made here.

### Ordinary shadow offset — 2026-09-09

- Reference renderer inspection (`PG`/`LG`) establishes that distance × cosine/sine(angle) is always passed to its drop-shadow filter. `shadowIsDirectional` controls a separate texture/mask path, not whether distance and angle apply.
- Removed Refract's conditional zeroing of distance when Directional shadow is off. Existing distance and angle settings now affect ordinary shadows too; the recording geometry remains unchanged.
- Production build and all 173 core tests passed. The compositor test checks both switch states at opposite angles, the stationary recording center, and zero-distance angle independence.
- Further reference findings: shadow texture padding uses distance + 9 × blur; directional geometry doubles both dimensions and applies a diamond mask. Texture dimensions are capped through a 5000px downscale path; directional mode is disallowed when recording dimensions exceed 5000px. Intensity is applied to the final cached sprite. Refract's Canvas softness, attenuation, and directional shape are still approximations. These findings do not prove a full rendering match.

### Cached ordinary shadow texture — 2026-09-09

- Further read-only reference inspection found a Kawase filter behind ordinary drop shadows: quality = max(1, round(blur × 0.625)); decreasing kernels start at blur, with a 0.5 sample offset; each pass averages four diagonal samples. The drop-shadow stage offsets and tints the source before blur and applies intensity to its final sprite.
- Added independent diagonal sampling to the reusable GPU filter and a cached ordinary-shadow layer. Cache keys cover frame geometry, radius, blur, distance, and angle; intensity and zoom reuse the texture. Ordinary shadow intensity now applies to the result directly instead of the old arbitrary 0.6 attenuation. The Gaussian fallback matches the modeled kernel variance, but remains approximate.
- Kept the existing inset-interior exclusion and directional Canvas path pending reference composition verification. Reference filter resolution (3), exact raster scaling, shape rounding, directional diamond masking, and inset/shadow overlap still require direct visual/export comparison. This change is not a full shadow-parity claim.
- Production build and the existing 173 core tests passed. Two added shadow tests passed cached surface reuse across intensity/zoom, invalidation on distance change, zero-intensity skipping, and linear intensity blending. GPU Kawase comparison against an independent CPU implementation had maximum channel error 1/255 and mean 0.035/255 in the checked region. Background GPU and 720p MP4/GIF plus 4K MP4 encoder checks remained passing.
- Production editor inspector checks passed, including shadow numeric editing, reset, Undo, and previous background/inset checks. Inspected the rendered light-theme fixture and visible ordinary shadow beneath the recording.

## Directional shadow mask and editor hover regression — September 9

Inspection of the installed reference renderer established that the directional shadow doubles the shape dimensions and clips it to a diamond before applying the blur. Refract now uses that geometry with the cached diagonal blur implementation, and falls back to ordinary shadows for source dimensions above 5000 pixels. The inspector disables that option for unsupported sources while preserving the saved preference.

Validation: production build and all 177 core tests passed. Synthetic Electron inspector checks passed, including the directional toggle, changed canvas output, and Undo. The directional screenshot was inspected. The editor hover fixture also passed across playback, disclosures, wallpaper choices/context menus, timeline controls, speed menu items, and switches; geometry stayed stationary and nested controls remained isolated.

Exact exported pixel parity remains unverified: the installed reference requires activation to export. Filter resolution, large shadow texture scaling, and translucent inset overlap still need comparison. The synthetic checks do not establish full capture/export or complete UI parity.
