# Caption rendering verification

## Long-caption frame bounds

The compositor previously wrapped to available width but allowed an arbitrarily tall caption box above the frame. It now measures a shared caption layout and reduces font/spacing together only when necessary to fit within the frame margins. Normal captions retain their existing 30 px-at-1280 sizing, line spacing, and bottom margin. The text and source-time interval are unchanged. A per-context cache avoids repeating fitting calculations for the same caption and dimensions on successive preview/export frames.

Tests cover ordinary sizing, 150 explicit lines, long word-wrapped text, portrait, landscape, small, and very wide frames. Native Canvas renders of 24 lines were visually checked in 720×1280 and 1280×360 frames: the entire caption box and all lines remain visible. Very long text becomes small; this is a bounds correction, not evidence of reference typography or long-caption behavior parity. Simultaneous tall shortcut overlays and captions still need a combined layout review.

Run `node --import tsx scripts/verify-caption-fit.ts` to regenerate the three scratch images. Production build and all 88 tests pass.
