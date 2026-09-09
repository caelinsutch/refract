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

## Screen movement and zoom implementation

The shared compositor now exposes independent 0–100% Screen movement blur and Screen zoom blur controls. Both default off for new and existing projects. Twelve transforms span up to 1/60 second of output time, with source exposure adjusted for clip speed and clamped to the active segment. Movement strength blends historical centers; zoom strength blends historical scale. Instant screen animation bypasses blur.

Each sample renders the current decoded recording texture and its active masks together into an intermediate surface before premultiplied accumulation. Masks use current-frame activation for all samples, so a newly active mask is not omitted from older transforms. The existing rounded viewport clips the combined layer. Background, cursor, camera, captions and shortcuts remain outside this screen pass. Intermediate surfaces are reused per destination context and resized for output resolution. The screen blur represents artificial screen transforms, not optical flow or additional decoded source frames.

74 tests and production compilation pass. New tests cover independent channels, instant bypass, invalid strengths, cut-boundary clamping, moving/stationary output, zero-strength identity, seek determinism and opaque mask coverage across sampled transforms. This is compositor evidence only: actual blurred-screen export, full blur-mask edge QA, Retina preview performance and live reference comparison remain open. Twelve full recording samples may be expensive at 4K; no performance claim is made.

## Screen export and explicit preview quality

`node --import tsx scripts/verify-cursor-blur.ts --screen` now exports a one-second 1280×720/30 fps fixture with both screen blur channels and a blur mask. The decoded middle frame has mean RGB error 0.897/255. In the interior region, error is 1.010 against the blurred reference versus 34.805 against the sharp alternative. FFprobe counts 30 frames. This verifies the production compositor/encoder path; the desktop export dialog was not exercised.

The editor now offers explicit Quality and Performance preview modes. Quality remains the default. Performance skips cursor and screen motion accumulation; it does not edit project settings, and export retains the default quality compositor path. Pixel checks establish that switching performance mode leaves saved blur amounts intact and a subsequent default render restores blur. The control's native interaction and exact reference arrangement remain unverified.

Native-canvas rendering averaged 38.2 ms/frame over the short 720p fixture. A three-frame 4K sample measured 547.3 ms/frame in Quality and 0.114 ms/frame in Performance. This is a small native-backend measurement, not Electron's browser/GPU performance; it establishes that the quality implementation needs profiling and optimization, not that real-time 4K preview has been achieved. All 74 tests and production compilation pass. ScreenStudio's documented quality/performance distinction is the behavioral reference; its power-saving mode remains absent.

## Bounded mask-filter experiment — not adopted

A candidate cropped the recording draw to each mask plus a four-radius filter halo before applying blur. A checkerboard comparison covered center/edge masks, radii 0/4/20/60 and fractional source/destination geometry; the candidate differed from full-screen filtering by at most 2/255. Its encoded screen-blur fixture retained the expected exposure (interior error 1.009 against blur versus 34.805 against sharp).

The same native benchmark measured 40.3 ms per 720p frame and 507.9 ms per 4K quality frame, compared with the earlier 38.2/547.3 ms. This mixed, small-sample result does not establish a worthwhile performance improvement. The candidate was removed from production; the original compositor remains in place. The next useful step is browser/GPU profiling of filtering and layer accumulation, rather than assuming cropped draw bounds reduce actual backend filter work. The experiment remains only in ignored scratch files.

## Live control comparison

The updated Refract animation panel was visually inspected in macOS Light appearance; all three independent blur sliders are present at zero, along with Quality preview. Screen Studio's live accessibility tree confirms a different order: Screen animation style, Cursor animation style, then master Motion blur, followed by Advanced motion blur settings. Refract currently spreads the blur sliders around the style groups; regrouping and a master control remain needed for reference alignment. Screen Studio's editor screenshot still renders blank through the UI tool, so this observation establishes control order via accessibility, not a pixel-level visual match.

## Master control and reference grouping

The animation panel now follows the observed reference order: screen style, cursor style, master Motion blur, and collapsed Advanced motion blur settings. Advanced controls retain the independent screen movement, zoom and cursor strengths. The master multiplies each strength without destroying their relative settings. New projects remain at master zero, preserving the requested sharp default.

Older projects that saved independent strengths are migrated by factoring their maximum into the master and normalizing the component values; the effective strengths remain unchanged. Projects with no blur settings migrate to master zero. Invalid pre-migration values are rejected before normalization. All 75 tests and production compilation pass, including a migration round trip, preserved effective strengths, invalid inputs and master-off preservation of component values.

The refreshed verification app's accessibility tree confirms the new order and a zero master value on the legacy fixture. Live screenshot updates did not consistently follow the accessibility changes, so this is control-order evidence, not pixel-level visual approval. Advanced slider interaction, master-to-export verification, and exact reference strength/easing remain open.
