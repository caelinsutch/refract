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
- All 35 core tests and TypeScript/production build pass.
- Reproduce with `npm run build:native` followed by `node --import tsx scripts/verify-local-captions.ts`. The system Speech service must be accessible; sandboxed CLI runs can falsely report the recognizer unavailable.
- Live packaged editor verification imported a spoken MP4, generated three editable captions, displayed the first caption in preview, and saved/reopened the project successfully. Long recordings, other languages, and cancellation during model download still need live checks.

## Cursor capture

The ScreenCaptureKit recorder sets `showsCursor = false` so the pointer is not baked into video. A separate timer samples normalized cursor coordinates and button-up-to-down transitions approximately every 16 ms. Cursor samples use the same host-time origin and pause offsets as the video. The finalized `cursor.json` is loaded into the saved project for independent cursor rendering, click effects, and auto zooms.

The capture helper currently reports `permission: required` on this Mac. A permission-enabled live recording with cursor movement has not yet been verified. Polling can miss a press and release occurring between samples, and cursor shape/keyboard-event capture is not complete. These remain explicit gaps rather than evidence of exact reference parity.

The Swift helper inside `release/captions-preview/Refract-darwin-arm64/Refract.app` was also executed successfully against the spoken fixture and returned the same 17 timed words. The previous project was subsequently saved before relaunching the updated editor for the live workflow above.

## Caption layout

Caption rendering now wraps words within an 84% composition-width box, preserves explicit line breaks, and breaks oversized tokens only at grapheme boundaries. The backing plate grows to fit multiple lines. A rendered portrait fixture confirms the caption stays within horizontal margins and above the bottom edge. All 35 tests, the production build, and the shared MP4/GIF fixture pass after this change. Very large manually entered caption blocks and exact reference caption typography remain outside this check.

## Live captioned export and frame synchronization

A real desktop export exposed stale source pixels despite advancing caption timestamps: waiting only for `seeked` did not ensure Chromium had submitted the new video frame. Export now waits for both seeking and `requestVideoFrameCallback` before sampling the source or camera. See [the frame callback API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback).

The corrected packaged build exported the 5.44-second spoken project as 1920×1080 H.264 at 30 fps with AAC audio. Inspection at output second two showed the source timecode 00:00:02.000/frame 60 and the second generated caption. This supersedes the earlier container-only live export evidence: an encoded file with the expected duration alone did not prove moving source pixels. The live check covers this short 30 fps MP4; other export rates, camera decoding, and long recordings need equivalent live frame checks.

## Cursor button and stop-clock correction

The native sampler now detects newly pressed bits independently, so pressing right or an additional mouse button while left is held produces a click. Button state continues updating while paused, and resume refreshes the baseline to avoid replaying a press that occurred during the pause. A standalone Swift verification covers held buttons, releases, simultaneous buttons, paused presses, and fresh presses after resume. Run `swiftc -parse-as-library -module-cache-path native/.build/module-cache native/CursorButtons.swift scripts/verify-cursor-buttons.swift -o native/.build/verify-cursor-buttons` and then `native/.build/verify-cursor-buttons`. The native helpers compile successfully.

Stop now captures a fixed host timestamp on the capture queue before awaiting ScreenCaptureKit shutdown and writer finalization. Finalization latency no longer extends the requested recording duration. Live stop-time accuracy is not yet verified. The current helper still reports `permission: required`; polling can still miss presses that begin and end between samples. Event-based click capture is a remaining requirement. Apple's [event-monitor documentation](https://developer.apple.com/documentation/appkit/nsevent/addglobalmonitorforevents(matching:handler:)) describes a possible observation API, but the helper's event-loop integration has not been implemented or tested.

## Event-timed click capture

The passive Input Monitoring tap now listens for left, right, and other mouse-down events as well as keyboard events. With that tap available, cursor polling only samples position/visibility, avoiding a duplicate click from the pressed-button bitmask. Without Input Monitoring, the previous polling fallback remains active. Event locations use Quartz coordinates directly and events are mapped onto the same source clock, including pause offsets and rejection of queued events from before resume. The existing project loader sorts the combined cursor event stream by timestamp.

`verify-recorded-clicks.swift` exercises the actual Recorder click-ingestion method with two presses one millisecond apart, outside-bounds input, pause/resume, stale pre-resume input, and stopped capture. Both rapid presses survive, coordinates normalize correctly on a negative-origin display, and resumed time excludes the pause. This is a native method test, not proof of physical event-tap delivery. The harness compiles against a scratch copy of Recorder.swift with only CaptureMain omitted and the usual native support sources. Native production compilation passes. Physical rapid-click capture and tap interruption/recovery remain to be checked.

### Updated helper: live display regression check

After copying the current desktop bundle and native helper into the isolated verification app and restarting, a display recording completed through the normal recorder UI. The input listener reported active, Pause froze the timer at 12.03 seconds, Resume returned to Recording, and Stop opened the saved editor project at 18.95 seconds. Project `4e15d52d-c941-4e06-bb80-2bdd9bfc1e11.refract` is in the configured Application Support projects directory.

FFprobe decoded 884 H.264 frames at 3840×2160 and reported 18.951667 seconds. The cursor sidecar contains 1,180 entries, including the initial hidden marker and 1,179 visible samples, ending at 18,932.881 ms. The saved project references `media/screen.mp4` and has no audio, as selected.

No mouse-down or keyboard events were produced by the automated UI interactions. The captured cursor stayed at the same physical desktop position even while coordinate-based automation operated the recorder controls. These inputs therefore do not establish physical event-tap delivery. The check proves the new helper's normal recording/finalization path remains usable, but rapid physical clicks, microphone/system audio, and camera still need separate live verification.
