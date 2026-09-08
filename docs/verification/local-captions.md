# Local captions and cursor recording

## Local speech pipeline

`native/Transcriber.swift` uses macOS 26 SpeechAnalyzer and SpeechTranscriber with audio time-range attributes. Speech is processed on-device. Apple manages downloadable language assets through AssetInventory; the first use can require a model download. There is no server-transcription fallback. See [Apple's SpeechAnalyzer introduction](https://developer.apple.com/videos/play/wwdc2025/277/) and [AssetInventory](https://developer.apple.com/documentation/speech/assetinventory).

The desktop extracts a mono 16 kHz WAV from the project's source video, invokes the Swift helper, and groups timed words into short captions. Grouping respects punctuation, pauses, and duration; timestamps remain in source milliseconds. Preview and export select captions against the same source clock used for cuts and speed changes. Removed footage is not shown with captions, and retained 2× footage displays captions for the correspondingly shortened output interval. Generated captions remain editable and are saved in the project.

The Captions panel offers language selection, generation/regeneration, and cancellation. It explains model downloads and disables generation for silent videos. Generation replaces the caption track as one undoable edit; results are not applied to a different project if the user changes projects while it runs. Temporary extracted audio is removed on success, failure, or cancellation. macOS versions before 26 receive an explicit unsupported message.

## Verification

- Native helper compiled against the installed macOS SDK.
- Real on-device transcription passed on a synthesized 5.447-second English speech fixture: 17 timed words grouped into three captions.
- Every word timestamp was finite, ordered, positive-length, and within the audio duration. Recognized text included “local caption test.”
- Tests verify source-time caption selection through cuts and 2× speed changes, punctuation grouping, pause separation, invalid timestamps, and duration clamping.
- All 33 core tests and TypeScript/production build pass.
- Reproduce with `npm run build:native` followed by `node --import tsx scripts/verify-local-captions.ts`. The system Speech service must be accessible; sandboxed CLI runs can falsely report the recognizer unavailable.
- The current app with unsaved edits was preserved. The new packaged Captions UI, long recordings, other languages, and cancellation during model download still need live checks.

## Cursor capture

The ScreenCaptureKit recorder sets `showsCursor = false` so the pointer is not baked into video. A separate timer samples normalized cursor coordinates and button-up-to-down transitions approximately every 16 ms. Cursor samples use the same host-time origin and pause offsets as the video. The finalized `cursor.json` is loaded into the saved project for independent cursor rendering, click effects, and auto zooms.

The capture helper currently reports `permission: required` on this Mac. A permission-enabled live recording with cursor movement has not yet been verified. Polling can miss a press and release occurring between samples, and cursor shape/keyboard-event capture is not complete. These remain explicit gaps rather than evidence of exact reference parity.

The Swift helper inside `release/captions-preview/Refract-darwin-arm64/Refract.app` was also executed successfully against the spoken fixture and returned the same 17 timed words. The packaged editor was not relaunched because the existing app contains unsaved edits.
