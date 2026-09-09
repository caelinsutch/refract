/** Independent one-dimensional model of the inspected background filter.
 * Measures impulse spread; does not execute or embed the reference application.
 * Run: node --import tsx scripts/research/background-blur.ts
 */
const weights = [0.153388, 0.221461, 0.250301, 0.221461, 0.153388];
const passes = 20;

function impulseSigma(width: number, setting: number) {
  const strength = (width * setting) / 2000;
  const spacing = strength / passes;
  // Two samples on either side per pass, plus linear interpolation support.
  const radius = Math.ceil(passes * (2 * spacing + 1)) + 2;
  let pixels = new Float64Array(radius * 2 + 1);
  pixels[radius] = 1;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float64Array(pixels.length);
    for (let x = 0; x < pixels.length; x++) {
      for (let tap = 0; tap < weights.length; tap++) {
        const sample = x + (tap - 2) * spacing;
        const left = Math.floor(sample);
        const fraction = sample - left;
        next[x] +=
          weights[tap] *
          ((pixels[left] ?? 0) * (1 - fraction) +
            (pixels[left + 1] ?? 0) * fraction);
      }
    }
    pixels = next;
  }
  let mass = 0;
  let variance = 0;
  for (let x = 0; x < pixels.length; x++) {
    mass += pixels[x];
    variance += pixels[x] * (x - radius) ** 2;
  }
  return { strength, sigma: Math.sqrt(variance / mass), mass };
}

console.log(
  "| Output width | Setting | Reference strength | Modeled sigma | Current Canvas sigma |",
);
console.log("| ---: | ---: | ---: | ---: | ---: |");
for (const width of [720, 1280, 3840]) {
  for (const setting of [0, 25, 50, 100]) {
    const { strength, sigma, mass } = impulseSigma(width, setting);
    if (!Number.isFinite(sigma) || Math.abs(mass - 1) > 0.0001)
      throw new Error("Invalid impulse model");
    console.log(
      `| ${width} | ${setting} | ${strength.toFixed(2)} | ${sigma.toFixed(2)} | ${((setting * width) / 1280).toFixed(2)} |`,
    );
  }
}
