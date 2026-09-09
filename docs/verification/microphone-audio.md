# Independent recorded microphone audio

The native helper records microphone audio separately. Previously, the desktop recording-completion path mixed it into the screen source before constructing the editor project, removing independent mute/gain control. Screen Studio's inspected Audio panel exposes microphone and system-audio controls separately.

## Project and export foundation

Projects can now carry an optional project-relative microphone asset with its own gain and mute state. Validation and JSON round trips preserve it. Its clock helper follows source cuts and segment speed, applies per-clip gain/mute, and ignores the system/source master mute. It returns no playback position outside the edited duration.

The encoder accepts a separate resolved microphone input, trims and retimes it through each retained segment, then mixes it with any enabled source audio and output-clock music. Input indexes follow the enabled tracks, so source-muted microphone/music exports work correctly. GIF remains silent. The desktop export handler resolves the microphone path inside the project directory.

The actual MP4 verifier ran four cases: original source/music combinations and the same combinations with a distinct microphone tone. At 0.25 and 1.25 seconds, across the 2× edit, microphone amplitude was approximately 0.01248/0.01243 with source audio and 0.01249/0.01245 with source muted (expected 0.0125). Music remained approximately 0.03125. Source-muted output reduced the source-frequency component below 0.000002. All 93 tests and the production build pass.

## Recording and editor integration

New recordings retain the screen source and attach the separately probed microphone asset. The Audio inspector exposes independent microphone mute/gain with undo, alongside system audio and background music. Microphone preview follows source cuts, clip speed, gain, and mute without looping; caption generation prefers the microphone asset and allows microphone-only projects. Existing mixed-source projects retain their behavior.

The integration passes the production TypeScript build and all 93 tests. Physical microphone recording, audible preview synchronization, and native recording timestamp/offset verification still need end-to-end checks.

During saved-project verification, the native picker disabled Open for a `.refract` package. Open Project now treats packages as directories. Open and Import also bring the editor forward before showing their native sheet. After rebuilding and restarting, the picker exposed an enabled Open action, navigated into the package, and loaded the microphone fixture successfully. The Audio panel showed microphone gain 40%, source gain 100%, and music gain 5%. Muting the microphone hid its gain while both other tracks remained unmuted. Automated attempts to invoke Undo did not produce an observed state change, so live undo/shortcut verification remains open.
