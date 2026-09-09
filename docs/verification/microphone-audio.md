# Independent recorded microphone audio

The native helper already records microphone audio separately, but the desktop recording-completion path currently mixes it into the screen source before constructing the editor project. This removes independent mute/gain control in the editor. Screen Studio's inspected Audio panel exposes microphone and system-audio controls separately.

## Project and export foundation

Projects can now carry an optional project-relative microphone asset with its own gain and mute state. Validation and JSON round trips preserve it. Its clock helper follows source cuts and segment speed, applies per-clip gain/mute, and ignores the system/source master mute. It returns no playback position outside the edited duration.

The encoder accepts a separate resolved microphone input, trims and retimes it through each retained segment, then mixes it with any enabled source audio and output-clock music. Input indexes follow the enabled tracks, so source-muted microphone/music exports work correctly. GIF remains silent. The desktop export handler resolves the microphone path inside the project directory.

The actual MP4 verifier ran four cases: original source/music combinations and the same combinations with a distinct microphone tone. At 0.25 and 1.25 seconds, across the 2× edit, microphone amplitude was approximately 0.01248/0.01243 with source audio and 0.01249/0.01245 with source muted (expected 0.0125). Music remained approximately 0.03125. Source-muted output reduced the source-frequency component below 0.000002. All 93 tests and the production build pass.

## Remaining integration

The existing recording-completion mixer is intentionally still active until independent microphone preview and editor controls are connected. New recordings therefore do not yet create the separate microphone project field through the normal UI. Independent mute/gain controls, preview synchronization, caption transcription choosing the microphone source, and native recording timestamp/offset verification remain necessary before claiming the user-facing feature works. Existing mixed-source projects retain their behavior.
