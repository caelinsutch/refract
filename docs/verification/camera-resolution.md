# Camera resolution limits

The recorder options now expose 720p, 1080p, and 4K maximum camera resolutions, matching the choices observed in Screen Studio's Recording settings. The choice persists locally, defaults to the existing 720p behavior, and is snapshotted into the native capture configuration at recording start.

The Swift recorder enumerates the chosen device's formats and supported frame-rate ranges. It selects the largest pixel area within the requested 16:9 resolution ceiling, preferring up to 30 fps among equal-sized formats. Lower-resolution and lower-frame-rate cameras fall back to their supported format. If no format fits, recording reports that a higher limit or another camera is needed. The camera encoder uses the selected format's actual dimensions and scaled bitrate; it no longer assumes every input is 1280×720. A BGRA output format keeps the writer input independent of device-specific pixel formats.

Configuration follows the macOS SDK's device active-format and begin/commit configuration APIs. The iOS-only `inputPriority` preset is not used. Frame durations use the device's exact minimum duration below 30 fps rather than rounding a fractional rate.

## Verification

- Native helper build passed.
- TypeScript/StyleX production build passed; all 90 existing tests passed.
- The Swift format-selection verifier passed 720p/1080p/4K limits, 4K-to-720p fallback, invalid-limit fallback, empty/oversized formats, 24 fps support, and unsupported minimum frame rates.
- The desktop bridge writes the full selected capture configuration, including the resolution. Finished camera media is already probed for its actual dimensions before project creation.

Run the verifier with:

```sh
swiftc -parse-as-library -module-cache-path native/.build/module-cache native/CameraFormat.swift scripts/verify-camera-format.swift -o work/verify-camera-format
work/verify-camera-format
```

Live option persistence, physical camera format negotiation, output dimensions, and camera/screen synchronization at all three settings remain unverified. Compilation and synthetic format choices do not prove a real 4K camera recording or complete reference camera parity.

## Packaged-app follow-up

The updated recorder visibly shows the maximum camera-resolution selector at its default 720p alongside the existing recording options. A native AVFoundation discovery query returned zero cameras in this environment, so physical camera captures could not be verified.

The UI check exposed a separate recorder-window problem: showing the existing recorder reset its native bounds to collapsed while React retained its open options panel. The controls could therefore remain in accessibility while being visually clipped. `show()` now preserves the existing expanded state; a newly created recorder starts collapsed. Selection/persistence verification continues after this fix.

The rebuilt controller retained its visible options panel during the repeated interaction that previously clipped it. The native resolution popup still did not open reliably through the UI tool, so the control now uses directly selectable 720p/1080p/4K buttons with pressed-state semantics, consistent with the reference's visible choices. The live check successfully changed the selected state from 720p to 4K. No inference about physical camera output is made from this UI result.

A native View → Reload followed by reopening Recording options retained 4K as selected, verifying persistence across renderer reload. The test then restored 720p. The production build passed after the controller and direct-button changes. Physical camera verification remains unavailable with the current zero-device discovery result.
