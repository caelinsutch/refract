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
