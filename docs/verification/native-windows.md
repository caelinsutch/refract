# Native task windows and system appearance — 2026-09-08

`desktop/editor-window.cts` is the reusable native shell: real macOS traffic lights, screen-bounded initial sizing, native vibrancy, isolated renderer, local routing, navigation restrictions, crash/load cleanup, and parent focus restoration. Feature modules retain their own request/result validation; the crop module passes a snapshot of the current source frame and returns a confirmed rectangle. The editor is inert while the crop request is pending. Cancel/close resolves without an edit; confirmation uses ordinary project history. The web preview keeps the in-page dialog fallback.

The renderer shares its modal keyboard/default-action implementation. Native windows use the same theme and toolbar drag-region convention. Native vibrancy is used; this does not claim Apple's Liquid Glass API or exact reference material parity.

## System theme

All UI surfaces use shared light/dark tokens selected by `prefers-color-scheme`, with `color-scheme` controlling native form controls. This includes editor, recorder, crop, popovers and dialogs. Native editor background color follows Electron's system theme updates. Composition backgrounds, cursor drawing and shortcut badges are project/output content and deliberately do not change with application appearance.

Light colors include separate text, controls, borders, tracks and translucent materials, rather than simply inverting the rendered video. Focus and selection retain separate neutral tokens.

## Verification

- Production build passes. The native crop window opened separately with traffic lights and the source snapshot, without an editor backdrop.
- Enter confirmed a changed crop and returned to an undoable editor state. Reopening retained the confirmed value. Reset restored full source dimensions.
- The live crop window rendered in both macOS Light and Dark appearances. Switching back to Light updated the already-open window without reload. The user's original Light appearance was restored.
- Numeric-entry testing through the UI tool produced inconsistent digit entry. A draft string now prevents premature clamping while editing, but full multi-digit input still needs a reliable live check. Do not treat these tool actions as proof that entering 1000 worked.
- The generic shell extraction and native title/background refinements are build-checked; the running session used the initial native-window host during these live checks. A restart is needed to verify the final shell.
- Full editor/recorder visual review in both themes, all dismissal paths, resizing and native-window dragging remain to be checked. Screenshot checks here establish crop theme response, not complete app-wide visual parity.

## Light-theme follow-up

The current editor empty state, compact recorder, and expanded recording options were visually inspected in macOS Light appearance. Corrected pale clip/mask text, the recorder's white-on-white close control, and its fixed white countdown. Static token contrast ratios are 9.27:1 for light clip labels, 8.85:1 for light mask labels, and 5.70:1 for the light recorder close icon. Corresponding dark clip/mask text remains 4.57:1 and 6.99:1. Production build and whitespace checks passed. Loaded editor tracks and all hover/focus combinations still need a complete visual pass; token calculations are not a substitute for that inspection.

## Numeric-entry and lifecycle follow-up

Empty and intermediate numeric strings now preserve the existing crop instead of coercing an empty string to zero and clamping it to one pixel. A core regression check covers cleared fields, incomplete values, valid replacement, and out-of-bounds clamping. Production build and 59 core tests passed. After restarting the final native host, opening crop and dismissing it with Escape returned focus to the editor's Crop button. The title override listener was corrected to listen on BrowserWindow rather than webContents. Full numeric replacement through the UI tool remains inconclusive; no claim of a successful 1000-pixel entry is made.

## Live production-token regression check

The main process explicitly selects `nativeTheme.themeSource = "system"` at startup, keeping native materials/dialogs and renderer media queries on macOS appearance. The existing `updated` listener also refreshes the opaque editor background.

`scripts/verify-theme.cts` runs an isolated Electron process against the built production stylesheet. It checks 19 tokens covering editor surfaces, popovers, controls, modal/native material, recorder and expanded recorder, area labels, crop and toolbar, text, borders, sliders, and focus. Light → Dark → Light changes pass without reloading; every checked token changes and returns to its initial value. This test changes only the isolated process's theme override, restores `system`, and never opens a user project or changes macOS appearance. It verifies live computed styles, not complete visual or native-material parity.

Reproduce after `npm run build`:

```sh
npx tsc scripts/verify-theme.cts --target ES2022 --module Node16 --moduleResolution Node16 --esModuleInterop --skipLibCheck --strict --outDir work/theme-check
./node_modules/.bin/electron work/theme-check/verify-theme.cjs
```

Production TypeScript/Vite build passed. Electron requires macOS window-server access; the sandbox-only launch aborted before running the check, and the launch with window-server access passed.

## Full-editor modal keyboard verification

The isolated production-renderer verifier now opens Presets, checks initial name-field focus, types through Electron's text input, saves with real Enter key events, dismisses with Escape, and confirms focus returns to the Presets trigger. The saved name and reset input are checked; background video stays paused.

A forward-Tab check initially failed on the first key: Chromium placed focus on BODY after the name field while Save was disabled. The shared Modal now wraps Tab/Shift-Tab at its focusable boundaries, excluding disabled, hidden, and inert controls. If no eligible controls exist, focus remains on the dialog itself. Eight forward Tabs and eight reverse Tabs now pass without leaving the dialog, followed by successful Enter/Escape/focus restoration.

Run the full-editor verifier documented in `preview-transport.md`. The production build and all 121 core tests pass. This is actual Presets interaction in an isolated browser-import editor, not proof of every native crop/export dialog path. Each verifier run uses its own Electron profile so test presets do not affect the user's preferences or subsequent runs.

## Crop multi-digit entry verified in the full editor

The isolated production-renderer verifier now opens the shared CropEditor from the real editor control, selects the width field, and inserts `2`, `5`, and `6` as separate Electron text-input operations. Real Enter key events confirm the crop. Reopening shows width 256, establishing that incremental typing and default-action submission retain the complete value.

The verifier then replaces width with 123, dismisses with real Escape events, and reopens. Width remains 256, confirming that Escape discards the draft rather than modifying the saved project crop. The complete full-editor verification passes alongside the earlier playback, focused-button, preset, and modal focus checks.

This closes the earlier uncertainty about multi-digit input for the shared React crop component. It runs in browser-import mode using the in-editor modal; separate native window IPC, native material appearance, and native-window focus restoration remain distinct verification work. No user project or running application was changed.

## Production native crop host and IPC verification

`scripts/verify-native-crop.cts` creates an isolated parent window with the production sandboxed preload, installs the production crop host, and opens the actual crop route through `cropOpen`. The child uses the production generic editor-window shell and renderer, not a reimplementation of their IPC.

All three paths passed: entering `1000` as four separate native text-input operations and pressing Enter returned `{x:0,y:0,width:1000,height:1080}`; reopening with that returned crop restored width 1000; changing the draft to 800 and using Escape returned null; changing it to 800 and closing the native BrowserWindow also returned null. Each completion destroyed the child and restored parent visibility. The native title was checked as `Crop recording`. The open native crop renderer also followed process-local dark/light theme changes, with the system policy restored afterward.

```sh
npm run build
npx tsc scripts/verify-native-crop.cts --target ES2022 --module Node16 --moduleResolution Node16 --esModuleInterop --skipLibCheck --strict --outDir work/native-crop-runner
./node_modules/.bin/electron work/native-crop-runner/verify-native-crop.cjs
```

The run uses a generated 1920×1080 frame and its own profile. It does not modify the running Refract session or the system appearance. This closes the native-host numeric-entry and result/cancellation gaps. Parent DOM focus restoration, dragging, visual material comparison, and undo after accepting a native result in the real editor remain separate checks.

## Reference crop minimum and confirmation feedback

Read-only inspection of the installed Screen Studio editor bundle (`BCjI4y2S.js`, crop-window module) identifies an exported `MIN_CROP_SIZE` of 200, an undersize warning, and a disabled confirmation action while the crop is invalid. This is the editor crop window, distinct from the capture-area tools' separate 150-pixel message. No vendor code or assets were copied.

Refract's shared crop editor now declares 200 as the size-input minimum and displays a centered minimum-size message while either dimension is below 200. Confirmation is disabled during such drafts, including Enter through the shared default action. Existing project data and rendering are unaffected; this is new-crop confirmation behavior.

The real native-window verifier enters width 199, checks the disabled confirmation and warning, sends Enter, and confirms that crop IPC remains pending. It then replaces the value with 1000 digit by digit and confirms successfully. Escape and native-close cancellation still pass. The full-editor fixture was increased from 320×180 to 320×240 to exercise valid crops under this reference constraint; its complete keyboard/crop sequence passes. Production build passes. Exact spacing/material fidelity remains unverified because the reference editor screenshot is still white.
