# Dialog keyboard and focus corrections — 2026-09-08

The crop dialog previously accepted Enter only when its container was focused. Export and presets had no default Enter handling and did not contain focus natively. These were confirmed implementation defects.

A shared native HTML dialog now provides background inertness, focus containment/restoration, Escape dismissal, and default-action handling. Enter from single-line fields invokes the enabled default action. Select menus, focused buttons, multiline fields, composition input, and repeated keydown events retain their own behavior. Export cannot be dismissed during rendering. Native editor menu actions are ignored while a modal is open.

Live packaged checks passed:

- Crop width field → Enter confirmed and returned focus to Crop.
- Export → Enter opened the native destination sheet; Cancel returned without writing a file.
- Preset name → Enter saved the named preset. The temporary preset was then removed.

Focus styling uses a neutral ring rather than the primary accent; selected swatches have a separate token. Slider keyboard focus surrounds the thumb rather than outlining the entire track. Pointer/default shortcut flows suppress the extra ring, while Tab navigation enables it. Forced-color mode retains system focus indicators. This final input-mode styling is build-checked; a full visual keyboard/assistive-technology audit remains open. Production build and 58 core tests passed; the core tests do not establish dialog behavior, which was checked live as above.

## Reference crop window

The installed Screen Studio crop UI was inspected directly. It opens a separate macOS window with traffic lights, a 960×720 surface, a muted gray material, dimensions/position across the top, and confirmation/discard actions at the bottom. Refract's crop editor is still an in-page dialog; this batch fixes behavior but does not establish native-window or Liquid Glass parity. A screenshot does not prove use of Apple's Liquid Glass API. A dedicated macOS crop window remains the next implementation task.

Follow-up: crop now has a dedicated macOS window using a reusable task-window shell; see [native windows](native-windows.md). The browser fallback retains the shared HTML dialog.

## Native text undo routing

Undo/Redo menu actions now follow the focused window. Child windows use Chromium's native text editing stack. The editor routes text inputs, textareas and editable content to native undo before its modal guard; project history remains the path when focus is outside text editing. Range, color, checkbox and other non-text inputs do not divert project undo. The IPC endpoint accepts only Undo/Redo and only the main editor sender.

After restarting the packaged app, command search received `a`; Command-Z cleared it and Shift-Command-Z restored it. This is live evidence of native text undo/redo through the actual menu accelerators. Child-window numeric undo and all text-field types still need separate checks. Production TypeScript/StyleX build and whitespace validation passed.
