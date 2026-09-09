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

## Playback and export foundation follow-up

Read-only inspection of the installed playback module shows background music mapped from edited playback milliseconds modulo the media duration, with looping enabled. This supports an output-clock loop independent of source cuts and segment speed. It is implementation evidence, not an observed reference export. The inspector module specifies a 0–1 volume range with 0.01 steps, and the isolated track preview creates a separate audio element and resets it when stopped. No vendor code is included in Refract.

Refract now has a validated optional project background-audio asset with independent name, duration, mute, and volume. A shared clock helper supplies the modulo position. The MP4 encoder loops the asset, trims it to edited duration, and mixes it with the existing cut/retimed source audio without normalizing down either input. Music-only output works when source audio is absent or muted; GIF skips music. The main process resolves the asset inside the project directory before export.

The production encoder verifier generated two actual MP4s from distinct tones. At 0.25 and 1.25 seconds, across an edit into a 2× segment, the mixed source amplitude was 0.06237/0.06239 (expected 0.0625) and music amplitude was 0.03123/0.03115 (expected 0.03125). The music asset lasts only 0.5 seconds, so the later measurement also verifies repetition. Muting the source reduced its measured component below 0.000001 while retaining the music. Files remain ignored scratch artifacts.

This is the project/export foundation, not a finished user-facing feature. Native import, playback synchronization, editor controls, asset reopening, and library support still need implementation. Preview and export parity for a saved music-bearing project is therefore not yet established. Reference mix limiting and fades also remain unverified.

## Editor import and playback integration

The editor now imports audio through a native picker, validates an audio stream and finite duration with FFprobe, and copies the selected asset under a unique project-relative media filename. Cancellation or a project-directory change prevents attaching the result to a different project. Add/replace/remove, independent mute, 0–100% volume, and reset to 5% use project history. Removing a track retains its media for undo. A project-relative media URL resolver supports loading tracks from reopened projects.

Background playback uses a separate audio element with looping, output-clock seeking, preview-speed adjustment, and independent gain. Pause, mute, replacement, removal, and unmount stop that element. Late URL resolution is cancelled when the asset changes. The transport mute label now specifies source audio, matching its independent behavior. Save As copies the project media directory through the existing save path.

The production build and 84 tests pass. Live import of the generated WAV showed its filename and 5% gain, created a copied WAV in the disposable project's media directory, and enabled project undo. Remove returned to Add background audio; undo/redo restored the selected track. The UI automation reports some changes with a delay, so audible synchronization, repeated seeking, and final saved/reopened playback need a separate controlled check. No claim of measured live audio output is made. The reference's isolated Play/Stop preview button and user library remain unimplemented, and exact inspector spacing/icon parity remains pending.

A final filesystem check confirmed the saved manifest retains the imported project-relative WAV, 5000 ms duration, gain 0.05, and mute false, and the referenced copied asset exists. Reopened audible playback remains unverified.

## Isolated track audition

The selected track now has a Play/Stop control backed by a separate audio element. Audition starts at the beginning, uses the track gain, and does not change the video playhead. Stopping resets the audition position. Starting video playback, leaving the Audio inspector, replacing the track, or closing the project stops audition. Media URL resolution and playback errors are guarded against stale assets.

The production renderer build passes. The verification app reloaded to the empty editor without console errors. The Mac locked while reopening the saved music project, before the new button could be exercised, so live audition and audible playback remain unverified. This does not establish music library or complete inspector parity.

## Folder-backed User Library

Read-only inspection of the installed Audio inspector identifies separate `backgroundAudio.userLibraryPath` and `backgroundAudio.userLibraryTracks` endpoints. The inspector subscribes to the latter and copies a selected library track into the project. This establishes the folder/subscription/project-copy contract, but not the exact native watcher behavior or full library file-format support.

Refract now exposes an application-owned `audio-library` folder under its user-data directory. The Audio inspector opens that folder in Finder and lists direct regular audio files in a keyboard-operated selector. While the panel is visible it refreshes every 1.5 seconds, and refreshes on window focus. Choosing a track uses the same stream validation, unique project-relative copy, default gain, and undo state as native file import. Removing or relocating the original library file therefore does not invalidate a saved project's copy. Project imports do not silently add files to the library.

The library reader test verifies initial folder creation, numeric filename sorting, additions/removals, case-insensitive extensions, and exclusion/rejection of hidden entries, directories, symlinks, and paths outside the library. All 85 tests and the production build pass. Live Finder/selector verification remains pending. Bundled music categories/catalog, exact selector layout, and measured audible preview remain open gaps.

### Live verification follow-up

The verification app reopened the saved 12-second project with its original music asset and 5% gain. Adding a generated WAV to Refract's library folder made the User Library selector appear without reloading the editor. Selecting the WAV created a new UUID-named project asset and updated the audition button. Play changed to Stop while the video playhead remained at 0:00.00; stopping returned it to Play. Saving retained the new project-relative filename, 5000 ms duration, 0.05 volume, and mute false.

Removing only the generated library test file returned the inspector to its empty-library state without reloading. The selected project track remained available. A filesystem/hash check confirmed its copied bytes matched the original fixture after the library file was removed. This verifies live addition/removal, selection/import, saved independent media, and basic audition UI state. Audible output, exact stop timing, and reference catalog/layout parity are not established by these checks.

## Selected-track layout corrections

A live Light-appearance screenshot exposed horizontal inspector scrolling caused by the full imported track filename. The audition button now constrains its content to the available width and ellipsizes the label, retaining the full filename in its tooltip and accessible name. Its play/stop circle icons follow the reference inspector's control shape. Shared buttons can shrink within their parent width.

Read-only inspection of the reference Audio inspector confirms that background gain controls are conditional on music being unmuted, and reset belongs to the gain control. Refract now hides the gain/reset row while muted and uses its existing inline slider reset at 5%, removing the separate Reset volume button. The production build passes. The reference editor still returned a blank screenshot during this follow-up, so these changes do not establish exact visual parity.

Live verification of the rebuilt editor confirms the long audition label now ellipsizes within the sidebar and the horizontal scrollbar is gone. Its full filename remains in the accessibility tree. The inline reset is labeled “Reset Background audio volume” with a 5% tooltip. Toggling music mute on removed both the gain slider and reset from the accessibility tree; the fixture was then returned to unmuted state. This is a verified layout correction, not full reference inspector parity.
