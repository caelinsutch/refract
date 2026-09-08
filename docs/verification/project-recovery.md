# Project manifest recovery

Screen Studio's [changelog](https://preview.screen.studio/changelog) describes recovery after interrupted recordings and missing project data. Its [saving guide](https://preview.screen.studio/guide/saving-your-project) also documents explicit Save/Save As and an unsaved-changes prompt. The full workflow remains the target; this batch covers saved manifests only.

Refract now serializes manifest writes per project directory, writes to a unique temporary file, flushes its contents, and atomically renames it. Before replacing a valid manifest it preserves that version as `project.backup.json`, using the same atomic write. A damaged manifest never replaces an existing valid backup. Recording finalization and ordinary Save/Save As share this writer.

Opening a missing, malformed, or invalid manifest attempts the validated backup. A native Recover/Cancel prompt explains that recent edits may be missing. Recovery does not overwrite the damaged manifest immediately: the user reviews the recovered project and saves explicitly. A valid current manifest takes precedence. Permission/device errors are not treated as malformed project data. Neither valid source video nor camera files are reconstructed by this fallback.

Save captures its destination before asynchronous work, so opening another project while the save runs does not redirect the manifest into that project. Save As updates the active directory only when the original directory is still active. Renderer edits made while a save runs retain their unsaved indicator.

## Evidence

65 core tests pass, including real temporary-directory tests of three overlapping saves, the previous-version backup, corrupted/missing current data, recovery followed by saving, invalid backup rejection, invalid save rejection and temporary-file cleanup. Production TypeScript/StyleX compilation passes. Native prompt interaction is not yet verified: the UI tool reports the Mac locked.

## Still open

This is not autosave, unsaved-edit recovery, recovery of an interrupted video encoder, or proof of power-loss durability. Flushing the file and atomic rename reduce partial-write exposure; directory metadata is not explicitly synced. First saves have no prior backup. Unsaved-close/quit prompts, renderer-crash restoration, and interrupted native recording recovery remain to be implemented and exercised.

## Unsaved project replacement

Open Project and Import Video now ask Save / Don't Save / Cancel through a native message box before replacing an edited project. Save is the default Return action; Escape maps to Cancel. Failed/cancelled saves prevent replacement. If the project snapshot changes while the dialog or save is pending, replacement stops so newer edits are not discarded. Duplicate Open/Import requests share a synchronous in-flight guard. Native theme and keyboard behavior come from the platform dialog; they still need live interaction verification.

All 66 core tests and production compilation pass. A decision-flow test exercises all three responses, cancelled/failed saving, and a newer edit arriving during the prompt/save. This does not verify native dialog rendering or IPC delivery. Quit, closing the editor, starting a recording through all entry points, and crash recovery of unsaved edits are still outstanding.

## Recording start guard

Every recorder start request now asks the owning editor to resolve unsaved changes before capture begins. This covers starts reached through the toolbar, File menu, command menu, Dock activation and global recording shortcut because they converge on the recorder's start handler. Merely opening the recorder does not discard a project or prompt.

The native request uses an opaque identifier and accepts results only from the editor's webContents. Reload, renderer failure or window destruction rejects the pending request. Duplicate starts are suppressed while the decision/permissions are pending. Closing the recorder during that interval prevents the delayed start. The editor refuses a replacement request during another project switch, crop/modal interaction or export. Its native save prompt brings the editor forward if it was hidden.

Production compilation passes. The shared decision-flow tests cover save/cancel/failure/newer edits, but IPC and live recording integration still need an unlocked Mac. This does not yet guard edits made after recording starts, quit, or editor close; completion-time project replacement and those lifecycle paths remain open.

## Completed recording handoff

Recording finalization now persists the new project's manifest before asking to replace the editor. The existing project's save directory remains active throughout the guard, so Save in that prompt writes the existing edits to their own project. Only an approved replacement switches the active directory and delivers the new recording to the renderer.

If replacement is refused, the new recording remains saved, is registered with macOS recent documents, and a native notice offers to reveal its project folder in Finder. The editor remains on the existing project. A quit pending capture completion is cancelled on this path rather than discarding the retained edits immediately afterward.

Production TypeScript/StyleX compilation passes. The UI tool still reports the Mac locked, so actual completion, prompt dismissal, Finder reveal, and quit-during-capture interactions remain unverified. A separately opened/reloaded editor and simultaneous project actions still need lifecycle QA. Ordinary quit/close protection remains outstanding. Starting with Don't Save and finishing with the same dirty editor may prompt twice; that interaction still needs refinement against the reference.

## Close and Quit coordination

Editor close now resolves unsaved changes before hiding the editor; Cancel leaves it open. Quit defers to native capture finalization when needed, then requests the editor decision before re-entering the approved shutdown path. Duplicate close/quit requests coalesce. Permission to close a crop/modal/export interaction is not inferred: the existing editor guard rejects replacement while those interactions are active.

Transcription cancellation and recorder timer/global-shortcut cleanup now run on `will-quit`, not a potentially cancelled `before-quit`. Cancelling Quit therefore does not unregister the recorder shortcuts or abort transcription through that cleanup hook. Approved capture shutdown still finishes persistence before exit.

67 tests and the production build pass. The lifecycle test uses event-emitter hosts to cover duplicate requests, cancelled close followed by another close, capture deferral, cancelled quit followed by another quit, and the approved quit/window-close re-entry. It is not an Electron/macOS interaction test. Native Quit/Close, long-running recording finalization, modal refusal, and renderer-unresponsive behavior remain to be exercised; exact reference parity is not established.

## Competing-action race correction

A pending confirmation now refuses a competing action instead of sharing its approval. Duplicate requests within a single Close/Quit/Start operation are already suppressed by their callers. This prevents approval of a recording-start prompt from also approving a simultaneous Quit. Stale request identifiers cannot settle a later request; reload/crash/close rejects the outstanding request.

Recorder Close and Quit now invalidate a pending start generation. The start handler checks both that generation and recorder visibility after the project decision and after media permissions. Hiding the recorder during a delayed permission prompt therefore prevents a subsequent start, even though the BrowserWindow still exists.

68 tests and production compilation pass. The new guard test injects an IPC host and event-emitter window to verify competing-action rejection, sender checks, stale replies, and lifecycle cancellation against the actual guard implementation. Native delayed-permission interaction remains unverified.
