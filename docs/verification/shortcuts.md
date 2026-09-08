# Shortcut overlays — 2026-09-08

## Reference requirements

[Screen Studio's shortcut guide](https://screen.studio/guide/shortcuts) describes recorded shortcut labels, size adjustment, optional single-key display with typing suppression, a shortcut timeline, per-event disabling, and disabling matching shortcuts together. These requirements remain the target; this is an incremental implementation, not completed parity.

## Implemented

A saved source-time shortcut track carries key labels, modifiers, bounds, and disabled state. Validation checks identifiers, bounds, supported modifiers, and settings; older projects load with an empty track. The shared video compositor draws labels at output resolution, follows clip cuts/speed changes, and places labels above captions when both are present. Modifier labels use conventional control/option/shift/command ordering.

The Shortcuts inspector supports global visibility, label size, single-key visibility, seeking to an occurrence, disabling an occurrence, and hiding all matching shortcuts. Edits use normal project undo and saving. The placeholder editor hotkey tips were removed from this panel.

## Evidence

- Production TypeScript/StyleX build passed; 57 core tests passed.
- New tests cover source/output boundaries through cuts and 2× speed, global/event/single-key visibility, migration and malformed track rejection, and deterministic shared-compositor pixel output after backward seeking.
- Live packaged app opened a synthetic fixture with two ⌘C events and one K event. The ⌘C badge rendered in the composition. Hide all ⌘C disabled both switches and removed the badge; Undo restored both. Enabling single-key shortcuts and seeking to K displayed its badge at 3.00 seconds.

## Remaining

Native keyboard-event capture and its macOS permission handling, typing suppression, the dedicated timeline lane, reference transition/style comparison, and a real MP4 export containing shortcut labels remain unverified/unimplemented. The current fixture is synthetic and is not evidence of captured keyboard input. No global input listener was added in this batch.

Apple's [event-monitor documentation](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/EventOverview/MonitoringEvents/MonitoringEvents.html) specifies accessibility trust for global keyboard monitoring. Capture integration must report unavailable permission accurately and stop observing when recording stops.
