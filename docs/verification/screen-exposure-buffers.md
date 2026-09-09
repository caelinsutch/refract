# Bounded screen exposure buffers

Screen motion blur now accumulates its 12 samples into recording-sized buffers when the recording is fully inside the output canvas. Integer buffer origins preserve the pixel grid for fractional geometry. Resolution and sample count are unchanged. The original full-frame path remains for off-canvas recordings: Chromium produced differences of up to two channel levels in an off-canvas filtered fixture when those buffers were reduced.

The native canvas test and isolated Electron verifier compare every output channel against the full-frame path, including rounded clips, translucent highlights, blur masks, fractional origins, edge overflow and buffer reuse. Five Electron fixtures pass with exact equality. Production build and all 124 core tests pass.

Run the Chromium check with:

```sh
npx tsc scripts/verify-screen-exposure.cts --target ES2022 --module Node16 --moduleResolution Node16 --esModuleInterop --skipLibCheck --strict --outDir work/screen-exposure-runner
./node_modules/.bin/electron work/screen-exposure-runner/verify-screen-exposure.cjs
```

The buffers use fewer pixels for padded compositions; no frame-rate improvement is claimed without a representative editor benchmark. These fixtures do not establish exact Screen Studio rendering parity.
