# Recording completion workflow

## Reference evidence

Inspected installed Screen Studio 3.7.5 through its Record menu. The menu exposes Create project, Export and copy to clipboard, Export and create shareable link, Export and save to file, and an independent Automatically create zooms toggle. Opening the menu is read-only; no completion preference was changed. The editor AX tree is readable, but both normal and raised-window screenshots still contain a blank white surface, so this observation does not establish visual parity.

Read-only inspection of the locally extracted reference bundles corroborates the menu behavior:

- `BCjI4y2S.js`: recording-button dropdown and Record menu update the same `actionAfterRecording` preference. The dropdown also exposes Quick export settings. Share-link availability is conditional.
- `D4qqfDv_.js`: default action is `create-project`. Losing share-link availability resets that action to create-project.
- `oMg2Y2HW.js`: the quick-export controller checks a project flag before dispatching the selected completion action. Ordinary project opening must not accidentally trigger a new export. The quick-export widget can be shown independently of choosing an automatic completion action.

These are observations of behavior and configuration; vendor implementation and assets are not included in Refract.

## Refract's current path

`desktop/main.cts` finalizes and probes recording media, builds the project with the capture-time automatic-zoom choice, persists the manifest, adds a recent document, runs the current-project guard, and emits `recording-finished`. If the guard declines replacement, it keeps the saved recording and offers Finder access.

`src/App.tsx` loads that event's project and media. `src/core/recorder.ts` has no completion action in CaptureChoice. `src/Recorder.tsx` persists automatic zooms and camera resolution, but no completion preference. The existing export entry point always asks for a destination through the native save sheet. Frame-image copying exists; it is not video-file clipboard export.

Thus only Create project is implemented. Automatic file export, video clipboard delivery, quick-export widget/settings and share-link completion are outstanding. The existing export encoder and atomic destination handling are reusable, but do not prove this workflow works.

## Implementation and acceptance scope

1. Persist typed completion preferences and quick-export settings; snapshot the selected action when capture begins. Expose the same preference in recorder controls and native Record menu. Changing settings during a recording must have defined, tested semantics.
2. Preserve the finalized project before dispatch. Dispatch once for the newly completed recording, after media is ready and the existing-project guard has resolved. Never trigger from ordinary reopen, React rerender or repeated IPC delivery.
3. File completion must use the configured format/resolution/frame rate and actual compositor/export path. Verify output with ffprobe and decoded-frame checks. Destination cancellation keeps the recording and returns to a usable editor/widget; encoder failure and cancellation preserve existing destination files.
4. Clipboard completion requires a finalized local video file and native file clipboard representation, followed by an actual paste into a supported destination. Copying a path string or still frame does not satisfy this requirement. Define file lifetime so pasted references remain valid.
5. Quick-export progress must use real render/encode progress, allow cancellation, and offer editing the preserved project. Verify keyboard handling and system appearance alongside the floating recorder.
6. Share-link completion depends on the missing upload/playback service and its permissions. Do not expose a nonfunctional success action. Implement and verify that service before claiming completion.
7. Cover no-audio, microphone, system-audio, cursor, pause/resume, camera (when hardware is available), and failed/interrupted finalization. Synthetic completion events can test dispatch but cannot replace a real capture-to-export check.

Next implementation priority is the completion coordinator plus the file-export path, with exact-once dispatch and cancellation verified before clipboard and service-backed delivery.
