# Automated media verification

September 8, 2026, Apple Silicon macOS. Run `node --import tsx scripts/verify-media.ts` after installing development dependencies. Requires FFmpeg and FFprobe on PATH.

The test generates a twelve-second source with a known tone, applies cuts and speed changes to produce six seconds, composites zoom/background/caption frames using the production compositor, and encodes using the desktop export arguments.

- MP4: 320 × 180, 144 frames, 6.000000 seconds; AAC audio present and duration verified.
- GIF: 320 × 180, 144 frames, 6.000000 seconds; looping stream verified.
- Encoded MP4 sample versus the expected composited frame: mean absolute RGB error 2.321 / 255 (threshold 8).

These checks validate the offline compositor and FFmpeg pipeline. They do not establish live capture, Electron IPC export, microphone/camera synchronization, or reference export equivalence. Screen Studio export comparison remains unavailable behind its activation screen.

Latest rerun after clip trimming and motion changes: all 21 core tests and the TypeScript/production build passed. Both media fixtures passed again. The export UI offers MP4/GIF, 1280/1920/3840 maximum dimensions, and 24/30/60 fps; this fixture exercises 320 × 180 at 24 fps, not every selectable combination. Full desktop export interaction, cancellation during encoder finalization, and camera/audio synchronization remain unverified. Live UI verification was paused because the Mac was locked.
