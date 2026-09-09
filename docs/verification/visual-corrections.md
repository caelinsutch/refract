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
