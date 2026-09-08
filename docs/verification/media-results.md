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
