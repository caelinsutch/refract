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

## Short-track export timing

`node --import tsx scripts/verify-short-audio.ts` creates a 0.4-second tone and exports a two-second edit: one normal-speed second, followed by a two-second source interval at 2× speed. Before the fix, the source-only output decoded to just 0.39925 seconds of audio. Both source and microphone segment filters now pad with silence and trim to the exact edited segment duration after speed processing. The verifier confirms two seconds of decoded audio, an audible initial tone, and silence at 0.6, 1.2, and 1.8 seconds for each independent track. This also covers a retained segment entirely beyond the audio asset's end.

The existing four-case background/source/microphone verifier still passes after the change, including frequency amplitudes across the 2× clip. Production build and all 93 core tests pass. This does not yet establish handling of delayed first microphone timestamps or physical capture alignment.

A subsequent live check in the active editor confirmed the Undo button restores microphone mute to off and its gain to 40%, disabling Undo and enabling Redo. The earlier failed automated attempts were not sufficient evidence of a history bug; keyboard shortcut delivery remains separately unverified.
