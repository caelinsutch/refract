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
