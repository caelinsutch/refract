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
