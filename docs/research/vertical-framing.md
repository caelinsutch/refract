# Vertical framing and the screen transform model

Evidence: read-only inspection of installed Screen Studio 3.7.5-4595,
`D4qqfDv_`, `5NxSBPmq`, and `6_EddXHC` component/model definitions.
No vendor implementation or assets are included in this repository.

## Observed behavior

The output-ratio menu exposes “Always keep zoomed in” only for a vertical
ratio. Its configuration chooses either explicit zoom ranges or a derived list
that fills gaps with system ranges. Disabled explicit ranges are excluded before
finding those gaps. The system range is auto-follow, has zoom 1, edge-snap ratio
0.5 and a central fallback target. It is derived rather than inserted as an
editable timeline item. Explicit ranges retain their own configuration.

Auto-follow is not simply “zoom to the most recent click.” The renderer groups
mouse events into bounded spatial clusters, sized from the visible content area
and zoom: horizontal allowance 0.5, vertical allowance 0.7. It selects the cluster
at the current source time and targets that cluster's center. If a range has no
mouse samples, it searches surrounding recording samples. A separate special
cursor-target path can override the grouping.

The zoom renderer first computes a target cursor position, a scale and edge-snap
ratio. It multiplies the range scale by an initial framing zoom. Cursor snapping
uses the visible area for that zoom relative to the content area. Source crop
coordinates are resolved before this framing operation.

The screen body is a rectangle with its own initial position and size. At each
scale the allowed frame extent is capped by the smaller of the output frame and
the scaled body. The body is positioned between its top-left and bottom-right
bounds according to the target scalar. That produces a **body scale and
translation**, not merely a source crop into an unchanged destination rectangle.

## Current Refract mismatch

`src/core/compositor.ts` computes one fitted destination rectangle (`x/y/w/h`).
Zoom currently divides the source crop's width and height by `z.scale`, then
renders that source region into the same fitted destination rectangle.
`src/core/motion.ts` auto targets are driven by clicks; without clicks an auto
range does not activate. Neither path implements the observed screen-body
transform or mouse-cluster behavior.

Consequences include wrong zoomed screen bounds, padding, shadow behavior, and
vertical framing. Adding a toggle that merely increases `z.scale` would preserve
these discrepancies. A crop-only implementation would also alter cursor and mask
coordinate mappings differently from the reference.

## Next implementation boundary

1. Recover the size resolver's initial zoom, content-area, forced-ratio padding
   and inset relationships before choosing formulas.
2. Introduce one pure screen-geometry result shared by composition, cursor/mask
   placement, pointer hit-testing, and motion-blur samples. Model source crop and
   destination-body transformation separately.
3. Verify manual zoom geometry before changing automatic tracking: neutral,
   centered zoom, each edge/corner, cropped source, inset, horizontal and vertical
   output, and source/output aspect-ratio mismatch.
4. Implement mouse-cluster targets on source time and deterministic spring
   checkpoints. Preserve behavior under seeking, clip cuts, and playback speed.
5. Derive vertical gap-follow ranges without modifying editable zooms. Wire the
   menu toggle only once preview and export share the verified geometry.

## Acceptance evidence still required

- Exact size resolver formulas and system-range boundary offsets.
- Reference screenshots or another reliable rendered comparison; current CUA
  screenshots remain white despite a readable accessibility tree.
- Real exported-frame checks for transformed screen edges, shadows, masks and
  cursor placement, including vertical output with and without explicit zooms.
- Save/reopen, Undo, and ratio changes preserving the toggle while making it
  inactive for nonvertical output.

This investigation is not completion of the vertical framing feature. It changes
the implementation plan because the current renderer model is insufficient for
one-to-one parity.

## First renderer correction — 2026-09-09

The compositor now preserves the complete source crop and transforms its
screen-body destination. It positions the scaled body between its legal edges
inside the padded content frame, centering an axis when the body is smaller than
the frame. Cursor coordinates, masks, and hit-testing share this mapping.

Each temporal screen-exposure sample now paints its own transformed shadow,
inset, rounded screen, and masks. The former fixed current-frame clipping region
was removed; cursor clipping uses the current transformed screen. Full-frame
exposure buffers are used because moving bodies and shadows can extend outside
the previous fixed bounds. This may increase blur rendering cost; bounded buffer
optimization requires the union of all transformed extents and shadow support.

Validation: 130 core tests pass. The previous cropped-source landmark test now
uses the new destination-body mapping and still checks a rendered pixel against
the inverse pointer mapping. A separate pixel test distinguishes body enlargement
from source recropping. `scripts/verify-screen-body.ts` encodes a fixture to H.264,
decodes it, and checks the landmark, expanded screen extent and background.
This is an encoder/compositor fixture, not a full recording-to-export UI run.
The full isolated Electron editor interaction verifier also passes.

Recovered size resolver evidence: content area is output minus twice background
padding; scale-to-fill is componentwise content/screen-with-inset; initial zoom
uses the maximum fill scale for vertical output, or for no-padding output, and
otherwise 1. The neutral-to-zoom transition and exact size normalization remain
to integrate. This first correction does not implement the vertical toggle,
mouse clustering, edge-snap behavior, or the initial-fill factor.

## Movement-driven automatic targets — 2026-09-09

Automatic zoom now consumes mouse movement samples rather than requiring clicks.
Consecutive samples are grouped while their spatial bounds fit horizontal 0.5
and vertical 0.7 allowances of the cropped source area at the range scale. Each
group contributes its bounding-box center at its first sample's source time.
Empty ranges fall back to the nearest preceding cursor sample, or the next
available sample. Recordings without any cursor data still remain neutral.

These targets enter the existing deterministic spring checkpoints, preserving
continuity and seek-order independence. Crop/source dimensions are included in
the cache key because they affect grouping. Four added tests cover movement-only
activation, grouping, boundary continuity and seeking, fallback/absent data, and
crop-sensitive group size; all 134 core tests pass.

Remaining difference: the allowance must also include the reference's initial
fill scale once the size resolver is integrated. Edge snapping and the special
cursor-target override are not implemented. This improves automatic tracking but
does not establish identical framing trajectories to Screen Studio.

## Initial fill scale — 2026-09-09

A shared initial-framing calculation now determines the scale from fitted screen
to filled content. Active zoom targets include it for vertical output and for
zero-padding output; padded horizontal output retains baseline 1. Neutral gaps
remain fitted. The factor is part of spring targets, so entering/leaving a zoom
uses the same continuous evolution rather than applying a discontinuous render
multiplier. Automatic grouping also accounts for this narrower visible area.
Ratio and padding changes invalidate motion checkpoints.

Four new tests cover portrait body bounds, the padded-horizontal/zero-padding
rule, neutral gaps, ratio/cache changes, group allowances, and boundary/seek
continuity. All 138 tests pass; the encoded H.264 landmark fixture still passes.
The current calculation follows Refract's existing crop/padding normalization;
exact reference inset and output-size normalization still need comparison. The
hidden system-gap ranges and vertical picker toggle are not implemented yet.

## Persistent vertical gap-follow toggle — 2026-09-09

The aspect-ratio picker now exposes “Always keep zoomed in” for explicit vertical
ratios. The boolean persists in project appearance, rejects invalid values, and
defaults off when loading older projects. Switching to Auto or horizontal output
makes it inactive without erasing the preference.

Enabled vertical projects derive auto-follow ranges in the gaps around enabled
explicit zooms, leaving the observed 1ms guard on each explicit boundary. These
ranges use scale 1 and never enter `project.zooms`; explicit ranges keep priority.
The existing source-time grouping, fill scale, and spring evaluation apply to the
derived ranges in both preview and export composition.

Three additional core tests verify gap generation, explicit/disabled priorities,
actual zoom targets, unchanged editable timeline data, serialization, validation,
legacy defaults, and Undo. All 141 tests pass. The Electron verifier additionally
checks that the vertical-only control is reachable with menu keyboard navigation.
Exact edge snapping, initial-frame behavior, inset normalization, and rendered
comparison with Screen Studio remain unverified.

## Remove the crop-center clamp — 2026-09-09

The motion output still constrained normalized targets to half the visible source
region from each edge. That was appropriate to the former source-recropping
implementation but prevented the destination-body model from reaching its legal
corner positions. Targets now span 0–1, with body positioning constrained by the
shared geometry. A new test checks top-left and bottom-right body edges; the old
crop-center assertion was replaced with bounded, settled corner targets.

Further recovered evidence: automatic zoom has an Advanced / Snap to edges slider
with range 0–0.45, reset value 0.25, and a percentage-of-visible-area readout.
The manual path supplies snap ratio zero. That setting and its visible-area
remapping are still absent; removing the obsolete clamp does not implement auto
edge snapping.

## Automatic edge snapping — 2026-09-09

Added per-zoom `snapToEdgesRatio` with an implicit 0.25 default and validation of
persisted explicit values in 0–0.45. Auto zoom's Advanced disclosure exposes the
percentage control and a 25% reset. Manual target sliders are now shown only in
Manual mode. Derived vertical gap ranges use the observed system value 0.5.

Automatic group centers are remapped through crop-local edge bands, limited by
visible output/content extent, effective zoom and the initial framing scale.
The small denominator epsilon from the observed remapping avoids division by
zero. Manual targets bypass the remapping. The resulting target enters spring
checkpoints, preserving continuity rather than snapping rendered frames directly.

Tests separate no-snap tracking from edge behavior, and cover corners, zero snap,
manual bypass, cropped coordinates, portrait bounds, serialization and invalid
values. All 145 core tests pass. The Electron verifier exercises Auto/Manual field
visibility, Advanced disclosure, numeric Enter commit, and Reset.

The rule is implemented against Refract's current size normalization. Matching
inset normalization, special cursor-target overrides and reference-rendered
trajectories still requires verification; this is not a pixel-parity claim.

## Per-zoom instant animation — 2026-09-09

Installed ZoomEditor exposes Instant animation per range. The renderer's animation
disable predicate checks proximity to that range's start/end with a 100ms window;
it does not disable mouse-follow springs throughout the whole zoom.

Added optional persisted `instantAnimation` with boolean validation and a sidebar
switch. Motion checkpoints include the suppression-window boundaries, resetting
position/velocity to the current target inside them. Interior target changes still
use the chosen spring. Screen motion-blur exposure is suppressed near instant
boundaries to avoid averaging across cuts. Disabled ranges have no effect.

Three new tests cover entry/exit cuts, ordinary spring behavior, interior automatic
retarget continuity and seeking, persistence, validation and blur suppression.
All 148 tests pass. The editor verifier toggles the new per-range switch on/off.
The implementation uses half-open 100ms windows for deterministic checkpoint
transitions; exact reference frame-boundary parity is still unverified.
