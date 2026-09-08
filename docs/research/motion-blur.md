# Motion blur investigation

## Reference evidence

Screen Studio's [Animations guide](https://preview.screen.studio/guide/animations) identifies a global strength control and separate controls for cursor movement, screen movement while zoomed, and zoom-in/out motion. Its [Performance Settings guide](https://preview.screen.studio/guide/performance-settings) says Quality preview includes export effects, while Performance can omit motion blur. These are separate requirements: lowering preview quality must not silently change export.

Read-only inspection of the installed application's packaged configuration also found four corresponding settings, each with a default value of 1. No vendor implementation or assets are included here. Those numeric defaults establish configuration values, not the shutter duration, blur kernel, or a matching Refract strength scale. Exact control ranges and animated output still need live comparison.

## Current compositor constraints

`src/core/compositor.ts` paints the background, recording with masks, cursor and click effects, then camera, shortcuts and captions. Source time is derived from the edited segment clock. Screen motion and cursor motion already have deterministic, seekable sampling. A general Canvas blur filter would blur stationary text and would not match directional movement.

The recording and masks must remain together during temporal accumulation. Blurring an unmasked screen and adding a sharp mask afterward can reveal content at the mask edge as the screen moves. Similarly, accumulating complete frames would blur captions, shortcuts and camera when only screen movement was selected. Cursor hiding and source cuts must apply to every exposure sample.

## Implementation requirements

1. Separate recording-plus-mask rendering, cursor rendering, and composition overlays. Keep stationary backgrounds, captions and shortcut labels outside the motion accumulation pass.
2. Sample transforms over a bounded exposure in output time, then map each sample through the active segment's speed. Clamp exposure to that segment's start; never accumulate removed footage or the preceding segment across a cut. Repeated source ranges remain separate output intervals.
3. Apply zoom and translation amounts independently. Sampled transforms may use the current decoded video texture for artificial camera motion; this must be documented rather than presented as optical flow or interpolation of source video motion.
4. Accumulate premultiplied color/alpha correctly in an intermediate surface. Repeated translucent source-over draws are not an equal-weight temporal average and can leave uneven opacity. Preserve native-resolution cursor geometry and hotspot alignment.
5. Avoid accumulation when strength is zero or the transform is stationary. User-requested cursor sharpness remains the baseline; cursor blur must be separately controllable. Existing saved projects must not acquire unexpected blur through migration.
6. Use the same deterministic quality path for export and quality preview. A later explicit performance-preview option can lower sample count or disable blur without altering the saved composition.

## Required evidence

Pixel checks must cover zero-strength identity, stationary identity, directional trails on moving geometry, no trail across a cut, per-component controls, backward/random seeking, alpha edges, mask coverage and cursor hiding. Actual short MP4/GIF exports must be decoded and compared with compositor frames. Profile a Retina preview before choosing default sample count. Live reference comparison must establish strength range, temporal behavior, material/control arrangement and acceptable visual matching.

## Status

This investigation establishes the layer boundaries and acceptance checks. Motion blur is not implemented yet. The Mac remains locked for live reference inspection. No blur sliders or placeholder controls have been exposed.

## Cursor implementation follow-up

Cursor-only motion blur is now implemented in the shared compositor and exposed as a 0–100% slider under Animations. It defaults to off, including for existing projects. Twelve source-time samples span up to 1/60 second of output time, adjusted for clip speed and clamped to the active segment start. The shutter duration and sample count are implementation choices, not measured reference values.

The pointer is drawn into a transparent texture, accumulated with equal premultiplied weights, then composited once over the recording. Stationary samples use the original vector path directly. The current screen transform is held fixed for this cursor pass; screen movement and zoom blur remain unimplemented. The implementation currently allocates intermediate surfaces for moving exposures; Retina performance profiling and surface reuse are still needed.

71 tests and production compilation pass. New checks cover source-cut boundaries, double-speed exposure, invalid saved strength, stationary identity, half-alpha non-overlapping pointer samples, a moving compositor fixture, zero-boundary identity and random-seek determinism. A rendered sharp/blur comparison was visually inspected: motion creates a directional trail while the unblurred pointer retains its vector outline. Strong motion can show discrete samples; adaptive quality and exact reference matching remain open. Native slider interaction and an actual exported blurred-cursor video still require verification.

## Cursor surface reuse and actual encoder check

Moving cursor exposures now reuse a pointer texture and accumulation surface per destination context. The pointer texture is rebuilt when pointer size changes; the accumulation surface grows in small buckets and is cleared for each exposure. Weak ownership lets the cache go with its destination context. The stationary vector path is unchanged.

`node --import tsx scripts/verify-cursor-blur.ts` runs a native-canvas drawing microbenchmark and a one-second 1280×720/30 fps production-compositor MP4 encode. The decoded middle frame has mean RGB error 0.705/255 over the full frame. Within the cursor region, error is 1.491 against the blurred reference versus 20.833 against the sharp alternative, establishing that the encoded output retains the blur rather than merely matching the background. FFprobe counts all 30 frames.

The allocation-heavy baseline measured 0.174 ms per cursor pass; cached runs measured 0.169 and 0.124 ms. These noisy, short native-canvas measurements do not establish an Electron Retina speedup. All 71 core tests and production compilation pass. Browser/GPU profiling, native slider interaction, screen zoom/translation blur and reference matching remain open.
