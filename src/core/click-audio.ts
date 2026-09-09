import type { ClickSoundCue } from "./click-sounds.js";
export type ClickSoundProfile = "soft" | "mechanical";
export type ClickSoundBank = Record<ClickSoundCue["kind"], Float32Array>;
/** Original synthesized transients; these are not recordings from a vendor mouse. */
export function clickSoundBank(
  profile: ClickSoundProfile,
  sampleRate = 48000,
): ClickSoundBank {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
    throw Error("Invalid click sample rate.");
  const transient = (release: boolean) => {
    const duration = release ? 0.032 : 0.048,
      data = new Float32Array(Math.ceil(duration * sampleRate));
    let seed = release ? 0x7823 : 0x2947,
      previous = 0;
    const frequency = (profile === "soft" ? 1800 : 3100) * (release ? 1.2 : 1);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 0x80000000 - 1;
      const high = noise - previous;
      previous = noise;
      const attack = Math.min(1, t / 0.0008),
        tail = Math.max(0, 1 - t / duration);
      const envelope =
        attack * Math.exp(-t * (profile === "soft" ? 145 : 105)) * tail * tail;
      data[i] =
        envelope *
        (Math.sin(2 * Math.PI * frequency * t) * 0.16 +
          high * (profile === "soft" ? 0.07 : 0.12));
    }
    return data;
  };
  const down = transient(false),
    up = transient(true),
    offset = Math.round(0.018 * sampleRate);
  const click = new Float32Array(Math.max(down.length, offset + up.length));
  click.set(down);
  for (let i = 0; i < up.length; i++) click[offset + i] += up[i] * 0.65;
  return { down, up, click };
}
/** Render an output-clock chunk without allocating an entire recording of silence. */
export function clickAudioChunk(
  cues: readonly ClickSoundCue[],
  bank: ClickSoundBank,
  sampleRate: number,
  startFrame: number,
  frameCount: number,
  gain: number,
): Float32Array {
  if (
    !Number.isInteger(sampleRate) ||
    sampleRate <= 0 ||
    !Number.isInteger(startFrame) ||
    startFrame < 0 ||
    !Number.isInteger(frameCount) ||
    frameCount < 0 ||
    !Number.isFinite(gain) ||
    gain < 0 ||
    gain > 1
  )
    throw Error("Invalid click audio render range.");
  const output = new Float32Array(frameCount);
  if (gain === 0) return output;
  for (const cue of cues) {
    const sample = bank[cue.kind],
      onset = Math.round((cue.time * sampleRate) / 1000);
    const start = Math.max(startFrame, onset),
      end = Math.min(startFrame + frameCount, onset + sample.length);
    for (let frame = start; frame < end; frame++)
      output[frame - startFrame] += sample[frame - onset] * gain;
  }
  return output;
}
