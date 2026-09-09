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

## Remaining verification

The follow-up work below adds native capture, permission handling and typing suppression, and verifies an MP4 with synthetic shortcut events. Live captured-event delivery, pause alignment, permission UI, and reference transition/style comparison remain unverified. The synthetic fixture does not establish native capture correctness.

Apple's [event-monitor documentation](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/EventOverview/MonitoringEvents/MonitoringEvents.html) specifies accessibility trust for global keyboard monitoring. Capture integration must report unavailable permission accurately and stop observing when recording stops.

## Timeline lane follow-up

The timeline now exposes Shortcuts with the 3 key and its visibility menu. It uses the established 48px lane height and 12px spacing, with tokenized neutral track colors. Each retained part of a source event is positioned separately, including repeated footage and different clip speeds. Click or Space toggles an event; right-click or Shift-F10 opens Hide all matching shortcuts. Disabled events stay visible with reduced opacity and a struck-through label. The context menu restores keyboard focus on dismissal.

Production build and 58 core tests passed, including a new test for event projection across cuts, 2× playback, and repeated source footage. Live packaged verification showed the lane on pressing 3, confirmed click/Space toggling without triggering playback, and confirmed that the context action disabled both ⌘C events and returned focus to the first block. Visual comparison of the lane against the reference is still pending; neutral colors are an implementation choice.

## Actual 1080p60 export

The packaged app exported the synthetic shortcut project through the native save dialog to an MP4. FFprobe counted 327 H.264 frames, 1920×1080 at 60/1 fps, with video duration 5.450000 seconds and AAC duration 5.439875 seconds. FFmpeg decoded the output without reporting an error. Decoded frames at 0.5 and 2 seconds show the two ⌘C occurrences; the frame at 4 seconds has no K badge because single-key display was disabled. Video content advances between these frames. The verification file and contact sheet remain ignored scratch artifacts. This is actual export evidence for saved shortcut events, not native keyboard capture.

## Capture adapter

The recording finalizer now accepts optional `media/keyboard.json` key-down samples on the pause-adjusted source clock. The adapter suppresses nearby unmodified key bursts (less than 500 ms apart), drops repeat events, normalizes modifier order, and caps each retained label at 1200 ms or the next retained event/source end. These durations are implementation choices awaiting reference comparison. Modified commands remain eligible during surrounding typing; isolated single-key actions remain available to the existing visibility control.

Older recordings without the optional file remain supported. Tests cover a typing burst mixed with a command, repeated/duplicate modifiers, isolated keys, invalid timestamps, source-end bounds, and saved-project validation. Production build and 63 core tests passed. Native event collection and permission handling are still pending; this adapter is not evidence that keyboard input is being captured. The typing heuristic can misclassify unusually slow typing or rapidly repeated single-key commands and needs live evaluation.

## Native listener implementation

The Swift recorder now creates a passive session-level CGEvent tap for key-down events. Its run loop is separate from screen encoding; callbacks enqueue normalized key labels, modifiers and repeat flags on the recorder's serial queue. Events before the first video frame, during pause, after stop, or delivered late from before the last resume are ignored. Event timestamps are converted to the source clock by subtracting the video origin and accumulated pause offset. Stop disables the tap and schedules its run-loop shutdown, including the start/stop race before the loop begins running.

The recorder writes `keyboard.json` alongside cursor data and reports available/permission-required/unavailable listener status. Recording options exposes the Input Monitoring permission action; source discovery reports its current permission. Video recording can continue when keyboard permission is absent. The tap is passive and does not alter or consume key events. Raw samples remain in the local recording project; only the filtered shortcut track is rendered.

Swift native compilation, TypeScript/StyleX build and all 63 core tests passed. Running the development helper's read-only permission query returned `required`. This is not a packaged-app permission check. Live event delivery, timestamp alignment, pause exclusion, shutdown, keyboard layouts/function keys, and permission UI still need verification. No real captured-keystroke result is claimed yet.

Implementation references: [Apple passive event taps](https://developer.apple.com/documentation/coregraphics/cgeventtapoptions/listenonly), [event-tap creation and run-loop source](https://developer.apple.com/documentation/coregraphics/cgevent/tapcreate(tap:place:options:eventsofinterest:callback:userinfo:)), and [listen-access preflight](https://developer.apple.com/documentation/coregraphics/cgpreflightlisteneventaccess()).


## Native key label normalization

AppKit delivers function keys as private Unicode scalars. The capture adapter now maps F1–F35 to readable labels, preserves explicit navigation/Return/Enter labels, and rejects unsupported private or control characters instead of drawing an unreadable badge. Ordinary letters still use the active keyboard layout's characters, normalized to uppercase.

The native verifier compiles against AppKit and passes all 35 function-key labels, navigation/Return/Enter/Space, Latin and non-Latin text, missing input and unsupported characters. The full native capture/transcription build also passes. This is label-conversion evidence, not proof of event-tap delivery or live keyboard-layout behavior.

Run from the repository root:

```sh
swiftc -parse-as-library -module-cache-path native/.build/module-cache native/KeyboardLabel.swift scripts/verify-keyboard-labels.swift -o work/verify-keyboard-labels -framework AppKit
work/verify-keyboard-labels
```

## Live permission flow and delivery limitation

The packaged recorder's permission action opened System Settings Input Monitoring. Enabling Refract there and rechecking through the recorder changed its option to “Keyboard shortcuts enabled.” This verifies the app-context permission flow. A subsequent 26.13-second window recording finalized successfully, but `keyboard.json` contained zero events after UI-tool key attempts. The global pause shortcut also did not change recorder state; clicking Pause worked. These observations do not establish whether the UI tool delivered global key events or the listener failed to receive them. Native keyboard delivery and pause alignment remain unverified, and the enabled permission label must not be interpreted as successful capture evidence.
