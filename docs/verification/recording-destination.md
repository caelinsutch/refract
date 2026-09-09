# Recording destination

Screen Studio's Recording preferences expose a destination for new projects and a directory picker. Refract now exposes the current folder and a Change directory action in its recording options. Existing installations retain their application-data projects directory until the user selects another folder; existing projects are not moved.

The native picker selects or creates a directory. Before updating the preference, Refract verifies the directory exists and is writable. It writes a unique temporary preferences file and renames it into place, updating the active destination only after that succeeds. Invalid choices preserve the previous preference. Picker cancellation returns no change. Recording start and directory selection are mutually excluded during the picker, and the picker is unavailable during countdown/capture/finalization.

New recordings create their unique `.refract` package in the selected folder using the existing capture/configuration/finalization path. Saved preference loading accepts absolute paths and falls back to the existing location for missing or invalid settings.

The production build and all 91 tests pass. A filesystem test verifies persisted folders with spaces/Unicode, invalid-directory rejection without preference changes, temporary-file cleanup, and malformed-settings fallback. Live picker and actual-recording destination verification are pending.

## Live picker follow-up

The packaged app rendered the current destination and opened the native directory picker. The UI tool reported concurrent state changes during navigation; the resulting saved path was the existing disposable audio-test project rather than the intended test folder. The native preference write and displayed path agreed, but this does not verify the intended folder selection or a recording in that destination. No recording was started in the incorrectly selected folder. The original application-data projects path was restored in preferences and the test instance was quit so it will reload that path.

A controlled destination selection, cancellation, app restart, and finalized recording in the chosen directory remain to be checked. The source change, production build, and filesystem tests are complete; full live workflow parity is not claimed.

## Actual recording in a configured destination

A subsequent controlled test set the destination preference to the disposable workspace folder and restarted the packaged app. This isolates the recording path from the earlier uncertain picker navigation; it does not replace the outstanding picker-cancellation check.

The live controller listed the main display, ran its three-second countdown, reported recording, and finalized after Stop. A new `.refract` package appeared inside the configured folder with `project.json`, `capture-config.json`, `media/screen.mp4`, `media/cursor.json`, and `media/keyboard.json`. The capture configuration points to that package's media directory. The project opened automatically in the editor at 0:00 / 0:07.28.

FFprobe decoded 305 H.264 frames at 3840×2160 with duration 7.283333 seconds. The saved source metadata agrees with that duration and geometry, and the project contains 452 cursor samples. This verifies real display recording, project finalization, and automatic editor opening in the configured destination. It is not a camera-resolution or audio-capture test. The original application-data destination was restored and the app restarted afterward.
