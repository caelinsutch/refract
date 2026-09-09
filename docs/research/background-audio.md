# Background audio reference inspection

Inspected the installed Screen Studio 3.7.5 editor on 2026-09-08 using a disposable 12-second synthetic video project and a generated five-second WAV tone. No bundled music or vendor implementation was copied into Refract. The test track was removed from the reference project after inspection.

## Observed behavior

The Audio inspector shows a System audio heading and an independent Mute system audio switch for this imported source. Background audio has Lo-Fi, Commercial, Electronic, Instrumental, and User Library categories. The empty User Library explains that tracks placed in its library folder will appear there and offers Open audio library folder.

Add background audio opens the native macOS file picker. Importing the generated WAV succeeds even though the public guide only mentions MP4 and MP3. After import, the inspector shows the track name, a Play action, Mute background audio, Background audio volume, Reset, and Remove background audio. The accessibility slider reports `0.05` immediately after import. Read-only inspection of the installed configuration defaults independently confirms a background-audio gain of `0.05`. The source mute remains separate.

The imported track does not populate User Library: that category continues to show its empty state. This distinguishes adding a track to the current project from installing a reusable library item. Removing the track restores Add background audio. No background-audio trim, offset, fade, or looping control was visible in this inspector.

The [official background music guide](https://screen.studio/guide/background-music) confirms the Audio inspector, supplied library, use across the timeline, and local file import. It does not specify the treatment of a track shorter than the video, seek synchronization, default gain, or fades. Lack of a visible control is not evidence that the underlying behavior is absent.

## Current Refract gap

Refract currently has source mute, source gain, and per-clip mute/gain. Preview applies the active clip's gain to the video element. Export trims and retimes source audio for each retained segment and concatenates it. There is no independent background track, local audio import, music preview, music mixing, or user library.

Relevant implementation surfaces are `src/core/project.ts`, `src/core/audio.ts`, `src/core/export.ts`, `src/App.tsx`, `src/bridge.d.ts`, and `desktop/main.cts`/`preload.cts`. Background audio must be independent of source mute; source-free and muted-source videos must still be able to contain music. Adding only a selector without preview, save/reopen, and export support would not close this gap.

## Implementation requirements and checks

| Requirement | Evidence needed |
| --- | --- |
| Native local file selection and cancellation | Cancel leaves the project unchanged; a supported audio file is copied into the project and becomes undoable state. |
| One current project track with name, mute, gain, reset, remove | Live UI and saved state; initial/reset gain matches the observed 0.05. Replacement preserves undo media. |
| Independent source and music controls | Preview and decoded export checks for source-only, music-only, both, and both muted. |
| Portable project assets | Save As, moved project folder, reopen, and undo/redo retain working audio references. |
| Playback clock and seeking | Verify the reference at cuts, speed changes, repeat footage, pause/resume, preview-speed changes, and a track shorter than the composition before selecting timing rules. |
| Export mixing | Actual MP4 with distinct test frequencies; measure each channel's contribution and duration at edited boundaries. GIF remains silent. |
| Library browsing | Verify folder location/refresh behavior and supported formats; project import and library membership remain separate. |
| UI parity | Compare selected-track layout, gain interaction, preview button behavior, and the audio timeline in both appearances. |

## Still unverified

Short-track repetition versus silence, leading/trailing fades, peak limiting/mix normalization, playback timing through source cuts and speed changes, preview-only Play behavior, volume range/step, user-library refresh rules, and the audio timeline visualization. A generated WAV imported successfully; this does not establish support for every audio codec/container. Supplied catalog assets and their distribution rights have not been evaluated and are not part of the repository.
