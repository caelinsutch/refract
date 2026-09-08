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
