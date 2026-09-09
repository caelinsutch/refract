# Automated media verification

September 8, 2026, Apple Silicon macOS. Run `node --import tsx scripts/verify-media.ts` after installing development dependencies. Requires FFmpeg and FFprobe on PATH.

The test generates a twelve-second source with a known tone, applies cuts and speed changes to produce six seconds, composites zoom/background/caption frames using the production compositor, and encodes using the desktop export arguments.

- MP4: 320 × 180, 144 frames, 6.000000 seconds; AAC audio present and duration verified.
- GIF: 320 × 180, 144 frames, 6.000000 seconds; looping stream verified.
- Encoded MP4 sample versus the expected composited frame: mean absolute RGB error 2.321 / 255 (threshold 8).

These checks validate the offline compositor and FFmpeg pipeline. They do not establish live capture, Electron IPC export, microphone/camera synchronization, or reference export equivalence. Screen Studio export comparison remains unavailable behind its activation screen.

Latest rerun after clip trimming and motion changes: all 21 core tests and the TypeScript/production build passed. Both media fixtures passed again. The export UI offers MP4/GIF, 1280/1920/3840 maximum dimensions, and 24/30/60 fps; this fixture exercises 320 × 180 at 24 fps, not every selectable combination. Full desktop export interaction, cancellation during encoder finalization, and camera/audio synchronization remain unverified. Live UI verification was paused because the Mac was locked.

## Export cancellation and failure cleanup

The Cancel export button now immediately invokes desktop cancellation, including while FFmpeg finalizes the file. Finalization checks cancellation before publishing the temporary output; rejected encoding, cancellation, and empty output remove temporary files while preserving any existing destination. A filesystem regression test covers those three paths and successful replacement. All 22 core tests and the TypeScript/production build pass. Cancellation after the final rename has begun cannot retract an already published export. Native UI verification remains pending while the Mac is locked.

## Export settings matrix

Run `node --import tsx scripts/verify-export-settings.ts`. All 18 combinations passed: MP4 and GIF at 1280 × 720, 1920 × 1080, and 3840 × 2160, each at requested 24/30/60 fps. Fixtures contain 5–12 moving frames (about 0.2 seconds), use the production compositor and encoder arguments, and are probed for codec, dimensions, frame count, duration, and absence of invented audio streams. MP4 reports the exact requested rate. GIF frame delays are quantized; total duration is within 25 ms of the requested frame schedule. This is not a browser GIF playback or long-recording stability check. The export dialog now correctly states that GIF output is silent.

The matrix does not cover every aspect ratio, custom image, camera feed, audio setting, or native save-dialog/IPC flow. The longer cut/speed/audio fixture remains a separate check. Raw matrix results are written to `work/export-settings/results.json`; generated video files are removed after verification.

## Live desktop export: canvas-origin failure

A real export through the packaged app and native save dialog exposed `SecurityError: Tainted canvases may not be exported`. Offline Canvas/FFmpeg checks did not cover Chromium's origin enforcement. The media scheme now enables CORS, responds with an explicit allowed renderer origin, and forwards range requests. Preview/export video elements and background images request anonymous cross-origin loading before assigning their sources. Renderer web security remains enabled. See [Electron custom schemes](https://www.electronjs.org/docs/latest/api/structures/custom-scheme) and [protocol handlers](https://www.electronjs.org/docs/latest/api/protocol/).

The saved 12-second test project also passed a live numeric trim from 12 to 11 seconds and Undo back to 12, followed by save. Direct pointer dragging was not verified because the computer-control tool returned a coordinate/window lookup error. The latest correction bundle is `release/export-preview/Refract-darwin-arm64/Refract.app`.

After the origin fix, the same native export completed successfully. FFprobe confirms 1920 × 1080 H.264, 30/1 fps, 360 frames, 12.000000 seconds; AAC audio is also 12.000000 seconds. File size is 5,011,158 bytes. This is the first verified packaged desktop MP4 export, using the saved synthetic fixture with a manual zoom. Camera, custom backgrounds, live capture, and native GIF export still require their own end-to-end checks. All 26 core tests and the production build pass.

## Correction: live source-frame verification

The local-caption test revealed that earlier live container metadata checks missed frozen source pixels. The renderer now waits for a submitted video frame as well as a completed seek. A new live 1080p/30 MP4 check verified source timecode 2.000 seconds/frame 60 at output second two, alongside the correct generated caption. See [local caption verification](local-captions.md). Offline compositor/encoder matrices do not by themselves verify Chromium video decoding.

## Explicit byte-range responses

The authorized local-media protocol now streams requested byte ranges directly, with Accept-Ranges, Content-Length, Content-Range, 206 partial responses, and 416 responses for unsatisfiable ranges. Origin validation remains in the protocol handler and media paths still come from issued opaque tokens. HEAD returns headers without streaming a body.

Tests verify fixed/open-ended/suffix ranges, bounds, exact streamed response bytes, content type, allowed-origin headers, HEAD, and 416 behavior. All 41 core tests and the production build pass. This change was prompted by a paused-preview seek that requested 5.427313 seconds but remained at media time zero. Live confirmation that this change resolves that symptom is pending because the Mac locked before the next app test. Temporary preview diagnostics remain local and are not part of this commit.

## Decoder-level range integration

`node --import tsx scripts/verify-media-seeking.ts` generates a six-second H.264 fixture with one-second keyframes and serves it through the same `serveMediaFile` handler on a temporary loopback-only HTTP server. FFmpeg seeks to 0, 4, 1, and 5 seconds. Each decoded frame hash matches direct file decoding exactly. Bounded requests exercise actual nonzero ranges: the verified run used 21 range requests. The server is closed after success or failure.

This validates decoder-level byte serving, including seeks made out of chronological order. It does not validate Electron's custom-protocol integration or paused canvas preview. The unsuccessful preview decoder experiments were removed from source and preserved as an ignored diagnostic patch under `work/`; the next live test should isolate the committed byte-range handler with the original preview implementation.

## Live Electron seek verification after unlock

The `range-isolated` packaged build uses the committed byte-range handler with the original preview code and no diagnostic/decoder experiments. On the saved timecoded fixture, End displayed source timecode 00:00:05.400 / frame 162 at timeline 5.447 seconds. Start restored timecode/frame zero. Playback from the start subsequently reached the correct final frame. The fixture contains 163 video frames at 30 fps (5.433333 seconds) and 5.447312 seconds of AAC audio.

This establishes that the byte-range handler resolves the observed frozen-picture seek in the actual Electron preview for this fixture. It does not establish all-codec, long-recording, or camera seek behavior.

## Export cancellation and live 60 fps verification

One live 1080p/60 fps run stopped advancing at 74%; its encoder stayed alive after Cancel. The same audio fixture and 327-frame PNG input completed through FFmpeg outside Electron. A fresh live run subsequently completed without changing the seek algorithm. The stall's original trigger is therefore still unresolved; a successful retry is not proof that it cannot recur.

Cancellation now destroys the input stream, requests SIGTERM, and escalates to SIGKILL after one second if our encoder does not exit. Pending frame writes also reject when the encoder closes; pipe errors cannot crash the main process. A process-level test uses a child that ignores SIGTERM and never reads stdin, verifies forced termination, and verifies that a blocked 8 MiB write rejects. Failed exports retain their error in the export dialog. Detached video decoders are released on success, cancellation, and failure.

The completed native-dialog export (`work/media-seeking/range-cancel-diagnostic.mp4`) contains H.264 at 1920 × 1080, 60/1 fps, 327 frames, 5.450000 seconds; AAC duration is 5.439875 seconds. At output 4.25 seconds, an extracted frame displays source timecode 4.233/frame 127, as expected when a 30 fps source is sampled at 60 fps. This verifies actual changing source pixels, alongside the previously verified preview seeks. It is a short fixture check, not broad export parity.

## Draggable recording controller

The controller background and left grab handle use Electron's native draggable region. Buttons and their descendants are excluded so source selection and recording actions remain clickable. Menu expansion/collapse preserves the window's bottom edge and horizontal position, clamped to its current display, rather than recentering on the primary display. The built controller's handle was visible, a drag gesture was delivered, and Recording options opened afterward. The UI tool does not expose window coordinates in its returned accessibility text, so the exact displacement was not independently measured. See [Electron custom draggable regions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions#custom-draggable-regions).

## Retina cursor preview

The preview previously rasterized every composition at a fixed 1280-pixel maximum dimension, regardless of the canvas's on-screen size or macOS display density. It now fits the available editor area in CSS pixels and allocates the canvas at that size multiplied by `devicePixelRatio`. Resizing or changing displays updates the backing pixels without changing the composition's apparent size. The cursor remains a vector path drawn directly into that backing canvas; it is not a bitmap enlarged after rendering. Export rendering still uses the requested output resolution.

Landscape, portrait, standard-density, Retina, and fractional-density sizing checks pass, alongside the existing compositor tests (43 tests total). The production build passed and the saved cursor fixture reopened in the updated desktop build with matching framing and a visible cursor. The UI screenshot is scaled by the inspection tool, so it is not an independent per-device-pixel sharpness measurement.

`node --import tsx scripts/verify-cursor-sharpness.ts` compares a cursor drawn directly at a 3200 × 1800 backing resolution against the previous 1280 × 720 canvas upscaled to that same resolution. In the fixed white-background cursor crop, intermediate edge pixels decreased from 997 to 245. This measures the removed resampling softness in that controlled fixture, not a universal visual-quality score. The script writes both rendered images under ignored `work/cursor-sharpness/`.

## First live display/cursor/pause capture

System Settings initially showed one enabled Refract entry while the actual app still returned permission-required. After the authorized permission update and user authentication, a second enabled Refract entry appeared and the running app listed the main display. Standalone helper permission results are not sufficient to infer permission state for a packaged build; verify through the app.

A local display recording completed through the floating bar, including Pause and Resume, and opened automatically in the editor. Its paused counter stayed at 10.21 seconds and resumed from that value. The saved project and H.264 source both report 23.395 seconds, at 3456 × 2234 physical pixels. The file decodes to 1,258 frames; its reported nominal frame rate should not be treated as measured constant capture throughput.

The separate cursor track contains 1,459 samples, 596 distinct positions, and 14 click events. First and last timestamps are 49.964 ms and 23,388.542 ms; the largest sample gap is 37.210 ms, so the long wall-clock pause was removed from cursor time. Six automatic zoom intervals were created. Camera, microphone, system audio, window/area recording, and sub-sample-duration clicks require separate live tests. The test footage remains private in the local application project directory and is not committed.

## GIF frame-delay correction

A new one-second production-encoder probe found that 60 fps GIFs contain alternating 10/20 ms frame delays. Total encoded duration alone had masked the problem: Chromium's current [DeferredImageDecoder frame-duration handling](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/graphics/deferred_image_decoder.cc) expands delays at or below 10 ms to 100 ms. Slow browser playback is therefore expected from those files even when FFprobe reports the requested duration; live browser playback was unavailable because the Mac was locked.

GIF export now offers 24/30/50 fps; MP4 retains 24/30/60. Switching formats converts 60 to 50 or 50 to 60 as appropriate, while retaining 24/30. Main-process validation and encoder arguments reject unsupported combinations. At 50 fps, the one-second GIF has 50 frames with a consistent 20 ms delay and a total duration of one second. The 24/30 fps probes have 40/50 ms and 30/40 ms delays respectively.

The export-settings verifier now inspects every decoded GIF frame duration with FFprobe's minimum-delay adjustment disabled and rejects any below 20 ms. All 18 short MP4/GIF combinations through 4K pass, including the revised GIF rates; production compilation also passes. These checks establish encoded timing, not long-file memory behavior or actual browser scheduling under load. Exact Screen Studio GIF options still need a reference UI comparison.

## Live window capture initialization fix

A window recording initially aborted inside `SCContentFilter.init(desktopIndependentWindow:)`, with the crash stack entering `SLSGetDisplaysWithRect` and a WindowServer initialization assertion. Capture startup now runs on the main actor and initializes AppKit before constructing the filter; the helper uses the prohibited activation policy to avoid presenting its own app window. Native compilation passed.

Repeating the same window recording through the floating controller succeeded, including Pause, Resume, Stop, and automatic opening of the saved project. FFprobe reports 1,505 H.264 frames at 2040 × 2034 and 26.131667 seconds, matching the project duration. The cursor file contains 1,631 samples from 47.979 to 26,123.743 ms, but only one distinct position because this test did not establish movement inside the captured window. This result verifies window recording finalization, not cursor movement or keyboard delivery.
