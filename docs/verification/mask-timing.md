# Mask timing boundaries

The compositor previously treated mask end timestamps as inclusive. Adjacent highlights therefore both rendered at their shared boundary, and a mask ending at an incoming clip's source timestamp appeared for an extra frame after a cut.

Mask intervals now include their start and exclude their end, on the retained source clock. This is shared by preview and export. Two pixel-level regression tests failed before the change and pass afterward: adjacent highlights render only once at the boundary; an ending mask disappears at a source cut; a mask on a 2× clip expires at the corresponding edited time; backward seeking restores its visible state deterministically.

All 97 core tests and the production build pass. These checks use generated frames, not a visual comparison with Screen Studio. Live mask interaction and an encoded export for these exact boundary cases remain unverified.

## Direct mask movement

Selecting a mask now allows dragging it within the composition preview. Hit testing uses the visible source coordinates and the mask's source-time interval. The gesture pauses playback, maps CSS pointer movement through the same crop/zoom geometry as rendering, and clamps the mask to the original source bounds without changing its dimensions. Preview-only draft state updates during the drag; release commits a single history edit. Escape, pointer cancellation, or lost pointer capture drops the draft. A changed project prevents the old gesture from committing over newer edits. Numeric position controls remain available.

The geometry test checks the resulting displacement in composition pixels for a cropped and zoomed source, clamps at each source edge, preserves dimensions, and leaves the saved mask object unchanged. All 98 tests and production compilation pass. These tests do not establish live pointer-capture behavior, undo interaction, resize handles, or a visual match with Screen Studio. The current running editor has unsaved edits and was not reloaded for this verification.

### On-demand preview correction

Code review of the preview scheduler found that paused frames render only when invalidated. The initial drag implementation changed its draft ref without requesting a frame, so its claimed continuous draft preview was not established. Pointer movement now requests a preview frame explicitly. Cancellation, Escape, lost pointer capture, and pointer-up also invalidate the preview to remove draft pixels. Native menu actions and non-modifier keyboard actions cancel the draft before changing the editing context, preventing playback/seek shortcuts from retaining a gesture computed against an earlier frame. Production compilation passes. Live gesture verification remains outstanding.

## Saved-mask validation

Project validation now checks individual masks: nonempty unique IDs, finite numeric fields, valid source-time intervals, supported mask types, strength from 0 to 100, and normalized coordinates/dimensions from 0 to 1. Previously only the presence of the masks array was checked. Existing masks whose rectangle extends past the frame edge remain accepted because older numeric controls allowed that geometry and the compositor clips it. Zero-size and zero-strength legacy values also remain accepted.

Round-trip compatibility and malformed-mask regression tests pass, including null entries, duplicate IDs, NaN, unsupported types, and invalid ranges. All 100 core tests and production compilation pass. Native project-open error presentation was not exercised for this change.
