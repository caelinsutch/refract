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

Native keyboard-event capture and its macOS permission handling, typing suppression, reference transition/style comparison, and a real MP4 export containing shortcut labels remain unverified/unimplemented. The current fixture is synthetic and is not evidence of captured keyboard input. No global input listener was added in this batch.

Apple's [event-monitor documentation](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/EventOverview/MonitoringEvents/MonitoringEvents.html) specifies accessibility trust for global keyboard monitoring. Capture integration must report unavailable permission accurately and stop observing when recording stops.

## Timeline lane follow-up

The timeline now exposes Shortcuts with the 3 key and its visibility menu. It uses the established 48px lane height and 12px spacing, with tokenized neutral track colors. Each retained part of a source event is positioned separately, including repeated footage and different clip speeds. Click or Space toggles an event; right-click or Shift-F10 opens Hide all matching shortcuts. Disabled events stay visible with reduced opacity and a struck-through label. The context menu restores keyboard focus on dismissal.

Production build and 58 core tests passed, including a new test for event projection across cuts, 2× playback, and repeated source footage. Live packaged verification showed the lane on pressing 3, confirmed click/Space toggling without triggering playback, and confirmed that the context action disabled both ⌘C events and returned focus to the first block. Visual comparison of the lane against the reference is still pending; neutral colors are an implementation choice.
