# Media-clock preview transport

The editor now derives edited playback position from the source video's current time within the active retained clip. Previously the animation loop advanced an independent wall clock, while a React effect repeatedly sought the video when it differed by more than 40 ms. That could let timeline overlays and click audio run ahead of stalled media and introduce corrective seeks during normal playback.

The new transport holds position while seeking or lacking current media data. A stationary media clock does not advance the timeline. At a clip boundary it publishes the exact edited boundary, seeks the next retained source start, and applies that clip's speed multiplied by preview speed. The final boundary either stops at exact edited duration or seeks the first retained source start for looping. Source time already incorporates playback speed, so the mapping divides only by clip speed rather than multiplying by preview speed again.

The source synchronization effect now seeks only while paused or starting playback; it does not correct every running frame against a throttled React value. During playback the shared time ref belongs to the media transport, preventing unrelated React renders from replacing it with an older timeline display value. The Play button explicitly resets that ref when restarting from the end.

Three core tests cover stationary media, buffering/seeking, invalid media time, removed source footage, 2× clip mapping, exact end, and looping to a trimmed source start. All 121 core tests and the production TypeScript/Vite build pass. Actual Electron video playback, camera and auxiliary-audio alignment during stalls, and visual inspection remain unverified for this change. These tests validate transport decisions, not decoder behavior or full reference parity.

## Actual Electron media verification

`scripts/verify-preview-transport.cts` bundles the production transport helper and runs it against a five-second H.264 fixture in an isolated Electron window/profile. Four runs cover preview speeds 1×/1.5× and looping on/off. The retained clips are source 0.5–1.5 s at 1× and 3–5 s at 2×, producing two edited seconds.

All four runs passed. The first cut publishes edited 1000 ms and seeks source 3000 ms; the final result is exactly edited 2000 ms or a completed loop seek to source 500 ms. Immediate observations of each actual media seek confirm that the helper holds position and does not issue another seek. Pausing the real media for 200 ms holds the edited position within 1 ms. Observed elapsed times including that hold were 2209 ms at 1× and 1553–1556 ms at 1.5×.

Compile and run from the repository root:

```sh
npx tsc scripts/verify-preview-transport.cts --target ES2022 --module Node16 --moduleResolution Node16 --esModuleInterop --skipLibCheck --strict --outDir work/preview-transport-runner
./node_modules/.bin/electron work/preview-transport-runner/verify-preview-transport.cjs
```

This verifies production transport decisions with actual Electron media playback. The harness drives the helper directly; it does not mount the full React editor, inspect rendered frames, measure auxiliary audio synchronization, or reproduce network/disk buffering. The user's running app and projects are untouched.

## Full React editor playback and keyboard regression

`scripts/verify-editor-playback.cts` loads the production renderer in an isolated Electron profile with no desktop bridge, imports a generated two-second H.264 video through the real browser-file input, then drives the rendered Play/Pause/End controls and C/Space keyboard handlers. It checks actual media advancement, a stationary paused video, and displayed timeline alignment after splitting and restarting from the end. The playback position now has a named timer role for accessible identification.

The first split-timeline run failed: Space restarted the video near 105 ms, but the timeline stayed at the second clip's 350 ms boundary. Keyboard playback bypassed the Play button's end-reset behavior. Both now call one `togglePlayback` handler that resets the shared position at end; pausing also publishes the latest media-clock value before handing control back to paused React state.

The corrected full-editor run passed (paused source 359.892 ms, restarted source 105.064 ms with displayed timeline within 100 ms). All 121 core tests and production build pass. This covers the actual React transport controls and split shortcut in browser-import mode, not native project IPC, multi-track audio, or visual frame fidelity.

```sh
npx tsc scripts/verify-editor-playback.cts --target ES2022 --module Node16 --moduleResolution Node16 --esModuleInterop --skipLibCheck --strict --outDir work/editor-playback-runner
./node_modules/.bin/electron work/editor-playback-runner/verify-editor-playback.cjs
```

## Native focused-button Space behavior

The full-editor verifier now focuses the End button and sends real Electron keyDown/keyUp Space events. Before the fix, the global playback shortcut prevented native button activation and started playback; the verifier failed with `Focused button Space also started playback`. Space now preserves activation for buttons and links, and ignores modified/repeated playback shortcuts. The global handler also ignores IME composition, editable content, and active dialogs/command menus.

The corrected full-editor check passes: focused End seeks to the end and remains paused. Additional dispatched repeated, composing, and Command-Space events do not start playback. These latter events validate renderer routing rather than OS shortcut interception. All 121 tests and production build pass. Full Enter/Escape testing across every modal remains outstanding.

## Pause precision after a slow render

The full-editor verifier now deliberately blocks renderer JavaScript for 120 ms during playback, then clicks Pause and compares actual media time immediately before and after. The original implementation failed: video moved from 472.399 ms to 344.343 ms because Pause published the last animation-frame position, and paused synchronization sought backward to it.

Pause now freezes the video immediately, maps its current source time through the production transport, updates the shared clock, and stops animation advancement before publishing paused state. The corrected real-editor check passes with a <30 ms position-change bound, followed by a stationary paused-media check. The complete crop, keyboard, and modal verifier still passes, as do the production build and 121 core tests. The artificial stall exercises delayed animation updates; it is not a benchmark of sustained 4K preview performance.

## Consistent pause behavior for editor actions

Opening Crop during playback after a 120 ms renderer stall reproduced the same stale-frame rewind: source time moved from 432.899 ms to 295.106 ms. A shared `pausePreview` now freezes/samples active media and publishes its edited position. Play/Pause, Crop, export UI/start, command-menu opening, clip trimming, mask drag start, and music audition use this helper. Explicit timeline seeks, project loads, and media-end publication retain their own target positions.

The full-editor crop-opening regression now passes with a <30 ms source-position change, followed by the existing crop confirmation/cancellation and keyboard checks. Build and 121 core tests pass. Crop opening and ordinary Pause were exercised with actual media; other callers are covered by the shared implementation and compilation but have not individually undergone the artificial-stall check.

## Exact numeric trim entry

Shared slider readouts are now editable. Activating the value opens a selected numeric text draft; Enter or blur commits a finite value clamped to that control's bounds, Escape discards it, and empty/invalid drafts leave the value unchanged. Enter/Escape restore focus to the readout. Draft keystrokes do not mutate the project. This enables exact trim times as well as exact values for other existing slider controls.

The full-editor verifier types 0.75 into Trim start one character at a time and checks that the committed value remains unchanged until Enter. It then verifies an exact 0.75 result and that Escape discards a replacement. The assertion reads React's committed value attribute because native range value properties can round to a step grid anchored at a fractional clip boundary. All full-editor checks, the production build, and 123 core tests pass. Exact visual comparison of the editable readout with the reference remains pending.

## Numeric readout precision

A follow-up full-editor regression exposed that opening an exact value of 0.755 and confirming without typing changed it to 0.76. The editable draft was initialized from the rounded readout. Drafts now start from the full stored number; only the inactive readout is rounded. The updated verifier types 0.755, commits it, reopens and confirms unchanged, then checks Escape cancellation. The full editor sequence and production build pass. This prevents merely opening a value editor from changing fractional clip boundaries.

## Clip trim gesture commit and cancellation

Timeline clip trimming now renders a temporary timeline project while dragging and commits one edit at release using the release event's coordinates. Escape, pointer cancellation, or lost capture discard the temporary trim. Cleanup releases pointer capture and removes listeners; a concurrent project change prevents a stale gesture from overwriting newer edits. Non-primary pointer presses do not start trimming. Previously each pointer move edited project history and the release position was ignored.

The full-editor verifier uses real Electron mouse events to move a clip edge, confirms that saved trim remains unchanged during the drag, cancels with Escape, and verifies unchanged saved length. A second gesture releases at a different coordinate without an intermediate move event; the resulting trim is applied, and one Undo restores the original value. The complete editor verifier, production build, and 123 core tests pass. The temporary draft currently updates timeline geometry; inspector values intentionally reflect the committed clip until release. Exact reference drag motion and all other timeline range gestures remain separate work.

## Zoom/mask creation cancellation and release coordinates

New timeline ranges now use the pointer-up position rather than the last pointer-move sample. Escape discards the creation draft, cleanup releases capture, and project replacement cancels the pending gesture so it cannot overwrite newer edits. Zooms and masks share this creation path.

The full-editor test uncovered an unrelated hit-testing obstruction: the informational `Preset saved` status message intercepted the pointer over the zoom track. Informational status messages now ignore pointer input while retaining their status semantics. With that corrected, real mouse input verifies cancellation produces no zoom, then releases 160 pixels from the anchor without an intermediate move and obtains the expected 158-pixel range (including the existing 2-pixel visual gap), rather than the default click duration.

The complete editor verifier and production build pass. Core tests remain at 123 passing. Zoom creation was exercised live; mask creation uses the shared handler but has not been independently exercised in this sequence.

## Existing timeline range gestures

Zoom and mask moves/resizes now use a temporary timeline draft. Release commits the final pointer coordinates once; Escape, pointer cancellation, lost capture, project replacement and unmount cancel the draft. The drag scale stays fixed during the gesture. A no-op does not create an edit. Clip trimming and range creation cancel an outstanding range edit before starting.

The isolated production editor verifier exercises real Electron pointer input for an existing zoom: visible resize draft, Escape restoration, release with no intermediate move, one-step resize undo, move preserving duration, and one-step move undo. These checks passed with the previous playback, modal, crop, numeric trim and range-creation checks. Production build and 124 core tests passed. Masks share this handler, but this run did not independently exercise mask gestures or compare their interaction to Screen Studio.
