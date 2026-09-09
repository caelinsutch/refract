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
