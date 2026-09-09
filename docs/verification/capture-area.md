# Area selection

The overlay previously submitted its last React-rendered rectangle on pointer-up. A release at a different position from the last processed move could therefore use stale coordinates. Pointer capture could also deliver coordinates outside the display-sized overlay without clamping.

The overlay now computes the final rectangle directly from the pointer-up event, using the same display-clamped geometry helper as the live preview. Reverse-direction drags normalize to the same rectangle. Only primary-button presses start selection, and pointer cancellation resets both the origin and rectangle. Selection still requires width and height of at least 32 logical pixels before returning to the recorder.

Two core tests cover both drag directions, negative/overflow coordinates, exact release coordinates, zero-size clicks, and the 32 versus 31.9 width boundary. All 95 core tests and production compilation pass. These tests verify geometry; live overlay dragging, multi-display selection, area capture output, and keyboard confirmation remain unverified.

## Selected-area keyboard entry

When an area result opens the recorder's confirmation panel, its Start recording button now receives focus without scrolling. Enter and Space use native button activation; Tab can reach Choose another area, and the existing Escape handler closes the panel. Selecting another area triggers focus again through the updated area state. This uses the shared recorder button styling and existing focus rules. Production compilation passes; live area selection and keyboard start have not yet been exercised together.
