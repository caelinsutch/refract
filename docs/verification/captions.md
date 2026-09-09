# Caption rendering verification

## Long-caption frame bounds

The compositor previously wrapped to available width but allowed an arbitrarily tall caption box above the frame. It now measures a shared caption layout and reduces font/spacing together only when necessary to fit within the frame margins. Normal captions retain their existing 30 px-at-1280 sizing, line spacing, and bottom margin. The text and source-time interval are unchanged. A per-context cache avoids repeating fitting calculations for the same caption and dimensions on successive preview/export frames.

Tests cover ordinary sizing, 150 explicit lines, long word-wrapped text, portrait, landscape, small, and very wide frames. Native Canvas renders of 24 lines were visually checked in 720×1280 and 1280×360 frames: the entire caption box and all lines remain visible. Very long text becomes small; this is a bounds correction, not evidence of reference typography or long-caption behavior parity. Simultaneous tall shortcut overlays and captions still need a combined layout review.

Run `node --import tsx scripts/verify-caption-fit.ts` to regenerate the three scratch images. Production build and all 88 tests pass.

## Combined caption and shortcut layout

Captions reserve a band for enabled shortcut events that overlap their source-time interval. The band includes the rendered badge height and gap, and is retained for the entire caption interval so text does not resize when a badge enters or exits. Disabling shortcuts or changing shortcut size invalidates the caption layout cache. Shortcut font size is capped so its badge occupies at most one quarter of frame height in extremely shallow compositions; normal dimensions retain the existing configured size.

The geometry test checks separation and margins for landscape, portrait, and 4096×256 output with a large shortcut setting. A native Canvas pixel test verifies that caption pixels stay unchanged after an overlapping badge expires and that disabling shortcuts recomputes the layout. The combined 1280×360 verifier image was visually inspected: the shortcut sits above the complete 24-line caption with a visible gap. All 90 tests and the production build pass. These establish the tested composition bounds and stability, not reference typography or live captured-key timing parity.
