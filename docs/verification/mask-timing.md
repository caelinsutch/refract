# Mask timing boundaries

The compositor previously treated mask end timestamps as inclusive. Adjacent highlights therefore both rendered at their shared boundary, and a mask ending at an incoming clip's source timestamp appeared for an extra frame after a cut.

Mask intervals now include their start and exclude their end, on the retained source clock. This is shared by preview and export. Two pixel-level regression tests failed before the change and pass afterward: adjacent highlights render only once at the boundary; an ending mask disappears at a source cut; a mask on a 2× clip expires at the corresponding edited time; backward seeking restores its visible state deterministically.

All 97 core tests and the production build pass. These checks use generated frames, not a visual comparison with Screen Studio. Live mask interaction and an encoded export for these exact boundary cases remain unverified.
