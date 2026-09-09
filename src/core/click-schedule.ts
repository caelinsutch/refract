import type { ClickSoundCue } from "./click-sounds";

/** Schedule against the editor clock; never extrapolate a stalled playhead. */
export class ClickSchedule {
  private scheduled = new Set<number>();
  private previous: number;
  private lowerBound: number;
  private revision: number;

  constructor(
    private cues: ClickSoundCue[],
    position: number,
    revision: number,
  ) {
    this.previous = this.lowerBound = position;
    this.revision = revision;
  }

  update(
    position: number,
    revision: number,
    speed: number,
    lengths: Record<ClickSoundCue["kind"], number>,
  ) {
    const reset = revision !== this.revision || position < this.previous;
    if (reset) {
      this.scheduled.clear();
      this.lowerBound = position;
    }
    this.previous = position;
    this.revision = revision;
    const starts: {
      kind: ClickSoundCue["kind"];
      delay: number;
      offset: number;
    }[] = [];
    for (let index = 0; index < this.cues.length; index++) {
      const cue = this.cues[index];
      // A short lead covers the 25 ms scheduling interval while limiting
      // queued audio if the editor stops advancing.
      if (cue.time > position + 40 * speed) break;
      if (cue.time < this.lowerBound || this.scheduled.has(index)) continue;
      const delay = (cue.time - position) / 1000 / speed;
      const offset = Math.max(0, -delay);
      this.scheduled.add(index);
      if (offset >= lengths[cue.kind]) continue;
      starts.push({ kind: cue.kind, delay: Math.max(0, delay), offset });
    }
    return { reset, starts };
  }
}
