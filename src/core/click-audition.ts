import { clickSoundBank, type ClickSoundProfile } from "./click-audio";

/** One audition at a time, including while Web Audio is waiting to resume. */
export class ClickAudition {
  private generation = 0;
  private release: (() => void) | undefined;

  stop() {
    this.generation++;
    this.release?.();
    this.release = undefined;
  }

  async play(
    context: AudioContext,
    profile: ClickSoundProfile,
    volume: number,
  ) {
    this.stop();
    const generation = this.generation;
    try {
      await context.resume();
      if (generation !== this.generation) return;
      const samples = clickSoundBank(profile, context.sampleRate).click;
      const buffer = context.createBuffer(
        1,
        samples.length,
        context.sampleRate,
      );
      buffer.getChannelData(0).set(samples);
      const node = context.createBufferSource();
      const gain = context.createGain();
      node.buffer = buffer;
      gain.gain.value = volume;
      node.connect(gain);
      gain.connect(context.destination);
      const disconnect = () => {
        node.disconnect();
        gain.disconnect();
      };
      this.release = () => {
        node.onended = null;
        try {
          node.stop();
        } finally {
          disconnect();
        }
      };
      node.onended = () => {
        disconnect();
        if (generation === this.generation) this.release = undefined;
      };
      node.start();
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      throw error;
    }
  }
}
