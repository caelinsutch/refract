# Refract

A macOS recording and editing application being built against Screen Studio 3.7.5's observed interface and workflows. The implementation uses React, StyleX, Electron, and a native Swift capture helper.

**Status: working editor prototype; recording toolbar and native capture in progress. Exact visual and functional parity has not been achieved.**

## Documentation

- [Research report](docs/research/report.md): product behavior, implementation evidence, platform evaluation, and sources.
- [Architecture](docs/architecture/design.md): module boundaries, timeline model, capture, compositing, persistence, and export.
- [Parity matrix](docs/verification/parity.md): requirements and acceptance checks.
- [Reference observations](docs/research/observations.md): installed-version findings and remaining unknowns.

Research precedes implementation. Each working milestone is committed and pushed independently. Vendor bundles and binaries remain outside this repository; the application is independently implemented.

## Run locally

Requires macOS, Node.js, and FFmpeg/ffprobe (currently discovered at `/opt/homebrew/bin`, or via `REFRACT_FFMPEG` / `REFRACT_FFPROBE`).

```sh
npm install
npm run build
npm start
```

`npm test` runs the time-map and zoom correctness tests. `npm run dev` runs the browser editor; native project operations and video export require the desktop app. All application JavaScript is authored in TypeScript (`.ts`, `.tsx`, and Electron `.cts` sources).

The initial editor implements import, project save/open, preview, cuts, speed, manual zoom, background/frame styling, fixed masks, SRT captions, appearance presets, and a frame-by-frame MP4/GIF export pipeline. Export and save/reopen still require full live verification. Camera capture, transcription, sharing, and several advanced effects remain incomplete.
