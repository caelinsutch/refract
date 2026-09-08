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
