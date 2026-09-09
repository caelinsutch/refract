/** Software equivalent of the four diagonal, bilinear RGBA8 shadow passes.
 * Shadows are black, so only alpha needs filtering. Do not quantize between
 * axes: the GPU averages all four samples before writing each complete pass.
 */
export function blurShadowAlpha(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  kernels: readonly number[],
): void {
  let alpha = new Uint8ClampedArray(width * height);
  let next = new Uint8ClampedArray(alpha.length);
  const horizontal = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];

  // UVs outside the texture are transparent; samples within half a texel of
  // an edge clamp to its center, matching the shader's explicit UV guard.
  const coordinates = (length: number, offset: number) => {
    const indices = new Int32Array(length * 4).fill(-1);
    const fractions = new Float32Array(length * 2);
    for (let i = 0; i < length; i++) {
      for (let side = 0; side < 2; side++) {
        const point = i + (side === 0 ? -offset : offset);
        if (point < -0.5 || point > length - 0.5) continue;
        const clamped = Math.max(0, Math.min(length - 1, point));
        const low = Math.floor(clamped);
        indices[i * 4 + side * 2] = low;
        indices[i * 4 + side * 2 + 1] = Math.min(length - 1, low + 1);
        fractions[i * 2 + side] = clamped - low;
      }
    }
    return { indices, fractions };
  };
  for (const offset of kernels) {
    // Shader offsets are float32 uniforms. Round before checking UV bounds so
    // a value such as 10.500000000000002 retains the same half-texel boundary.
    const shaderOffset = Math.fround(offset);
    const xs = coordinates(width, shaderOffset);
    const ys = coordinates(height, shaderOffset);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let side = 0; side < 2; side++) {
          const low = xs.indices[x * 4 + side * 2];
          if (low < 0) continue;
          const high = xs.indices[x * 4 + side * 2 + 1];
          const fraction = xs.fractions[x * 2 + side];
          sum +=
            alpha[row + low] * (1 - fraction) + alpha[row + high] * fraction;
        }
        horizontal[row + x] = sum / 2;
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let side = 0; side < 2; side++) {
          const low = ys.indices[y * 4 + side * 2];
          if (low < 0) continue;
          const high = ys.indices[y * 4 + side * 2 + 1];
          const fraction = ys.fractions[y * 2 + side];
          sum +=
            horizontal[low * width + x] * (1 - fraction) +
            horizontal[high * width + x] * fraction;
        }
        next[y * width + x] = Math.round(sum / 2);
      }
    }
    [alpha, next] = [next, alpha];
  }
  for (let i = 0; i < alpha.length; i++) {
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 0;
    rgba[i * 4 + 3] = alpha[i];
  }
}
