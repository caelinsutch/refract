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
