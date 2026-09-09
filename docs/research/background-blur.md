# Background blur: renderer comparison

Inspected 2026-09-09. This is a filter specification and an analytical comparison, not proof of visual or GPU pixel parity.

## Installed reference evidence

Read-only inspection of the installed application's decoded `5NxSBPmq.js` renderer and `Du1ndVwJ.js` inspector establishes:

- The slider runs from 0 to 100 in increments of 1. It appears for image and system wallpaper backgrounds.
- `FZ` skips the filter at zero and computes strength as output width × setting / 2000.
- It constructs the bundled `BlurFilter` (`ip`) with quality 20. Its default kernel has five taps.
- The filter runs horizontal and vertical passes separately. Each axis runs 20 passes, with sample spacing equal to strength / 20 pixels. The symmetric weights are 0.153388, 0.221461, 0.250301, 0.221461, 0.153388.
- Filter padding is twice the strength. Edge repetition is disabled. This is filter padding, not evidence that the source image should be enlarged.
- The image has centered cover geometry before filtering. Background blur does not apply to the recording layer.

These observations were obtained from configuration and mathematical operations. No vendor executable code or visual assets are included in Refract.

## Refract mismatch

`src/core/compositor.ts` currently applies Canvas `blur(setting × width / 1280)` and enlarges the source into a three-sigma overscan region. The Canvas value denotes Gaussian standard deviation; the reference strength controls tap spacing across repeated passes. Those quantities are not interchangeable. Replacing 1280 with 2000 would still leave a substantial spread mismatch. Enlarging the image also changes its visible crop as blur increases.

The independent model in `scripts/research/background-blur.ts` propagates a unit impulse through the observed one-dimensional filter, including linear sample interpolation. It computes standard deviation from the resulting distribution. It assumes unit-resolution textures and floating-point intermediates. It does not simulate GPU quantization, texture allocation, filter resolution, premultiplied color, color space, or edge behavior. The other axis has the same interior spread.

| Output width | Setting | Reference strength | Modeled sigma | Current Canvas sigma |
| ---: | ---: | ---: | ---: | ---: |
| 720 | 0 | 0.00 | 0.00 | 0.00 |
| 720 | 25 | 9.00 | 3.08 | 14.06 |
| 720 | 50 | 18.00 | 5.37 | 28.13 |
| 720 | 100 | 36.00 | 10.54 | 56.25 |
| 1280 | 0 | 0.00 | 0.00 | 0.00 |
| 1280 | 25 | 16.00 | 4.93 | 25.00 |
| 1280 | 50 | 32.00 | 9.41 | 50.00 |
| 1280 | 100 | 64.00 | 18.57 | 100.00 |
| 3840 | 0 | 0.00 | 0.00 | 0.00 |
| 3840 | 25 | 48.00 | 13.98 | 75.00 |
| 3840 | 50 | 96.00 | 27.79 | 150.00 |
| 3840 | 100 | 192.00 | 55.51 | 300.00 |

At width 1280 and setting 100, modeled reference sigma is 18.57 pixels versus the current Canvas request of 100 pixels. This is strong evidence that the existing blur is too broad, but the model alone does not establish an exact replacement sigma.

## Implementation and verification target

1. Implement an independent separable five-tap filter with 20 passes per axis, using offscreen GPU textures and the measured parameter mapping. Cache static backgrounds by source identity, output size, and blur setting so unchanged backgrounds do not execute 40 passes every video frame.
2. Render centered cover geometry before filtering. Keep geometry fixed as strength changes. Determine texture padding and edge alpha from a reference export rather than assuming the current overscan is correct.
3. Compare exported synthetic impulses, hard color boundaries, and edge/corner features at settings 0, 25, 50, and 100 in portrait, landscape, and square output. Include preview and export resolutions, transparent PNGs, and image replacement.
4. Verify cancellation/cache invalidation, system theme independence, sharp recording/cursor layers, and the export renderer. Establish a measured error tolerance against reference pixels before calling this parity.

The shipped filter remains unchanged in this research step. This avoids presenting an analytical approximation as a verified match.
