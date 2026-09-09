# Recording destination

Screen Studio's Recording preferences expose a destination for new projects and a directory picker. Refract now exposes the current folder and a Change directory action in its recording options. Existing installations retain their application-data projects directory until the user selects another folder; existing projects are not moved.

The native picker selects or creates a directory. Before updating the preference, Refract verifies the directory exists and is writable. It writes a unique temporary preferences file and renames it into place, updating the active destination only after that succeeds. Invalid choices preserve the previous preference. Picker cancellation returns no change. Recording start and directory selection are mutually excluded during the picker, and the picker is unavailable during countdown/capture/finalization.

New recordings create their unique `.refract` package in the selected folder using the existing capture/configuration/finalization path. Saved preference loading accepts absolute paths and falls back to the existing location for missing or invalid settings.

The production build and all 91 tests pass. A filesystem test verifies persisted folders with spaces/Unicode, invalid-directory rejection without preference changes, temporary-file cleanup, and malformed-settings fallback. Live picker and actual-recording destination verification are pending.

## Live picker follow-up

The packaged app rendered the current destination and opened the native directory picker. The UI tool reported concurrent state changes during navigation; the resulting saved path was the existing disposable audio-test project rather than the intended test folder. The native preference write and displayed path agreed, but this does not verify the intended folder selection or a recording in that destination. No recording was started in the incorrectly selected folder. The original application-data projects path was restored in preferences and the test instance was quit so it will reload that path.

A controlled destination selection, cancellation, app restart, and finalized recording in the chosen directory remain to be checked. The source change, production build, and filesystem tests are complete; full live workflow parity is not claimed.
