# Per-clip audio — 2026-09-08

The reference documents changing a recording or clip through its right-click **Set volume** menu: [Screen Studio guide](https://preview.screen.studio/guide/set-volume). Refract now provides that route and a clip inspector slider. The documented workflow informed the implementation; the preset values are our choice, not a verified reference match.

Clip gain is saved with each segment and multiplied by master volume. Muting preserves the stored level, produces silence for that interval, and leaves timing intact. Splitting retains these properties. A timeline icon indicates muted clips. Project validation rejects invalid gains and mute values.

## Evidence

- Production TypeScript/StyleX build passed.
- Core tests check gain composition, mute precedence, split/save round trips, and invalid gain rejection.
- `node --import tsx scripts/verify-clip-audio.ts` invokes the production FFmpeg argument builder, exports four segments with a cut and a 2× speed segment, and measures decoded audio. Relative RMS levels were **1.0000, 0.4995, 0.0000, 0.2492**, against requested **100%, 50%, mute, 25%**. Decoded duration was **3.999 seconds** for a four-second composition.
- Live packaged UI: right-click → Set volume → 50% updated the inspector. Mute retained 50% and added the muted timeline icon. Unmute, reset to 100%, and save completed. The synthetic test project was restored.
- The subsequent context-menu Mute adjustment preserves the stored gain, and menu focus is captured before moving focus inside the menu. These final changes are build-checked; the exact menu mute route has not yet been repeated live.

## Interaction polish

The clip menu uses the shared interruptible popover entrance, reduced-motion override, and concentric corners. Hover/focus colors use theme tokens. Keyboard arrows navigate options, Left returns from volume choices, and Escape closes. Opening captures the previous focus before focusing the first option so closing can return to the clip. Slow-motion visual inspection remains pending.

## Limits

This signal test verifies the actual export audio graph, not every recording device or long-form export. Preview uses HTML media volume: externally authored master gain above 100% is capped in preview, while export supports up to 200%. The current master-volume UI does not expose that boost. Physical microphone/system-audio capture, enhancements, music, and click sounds still need work.
