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
