import type { Project, Segment } from "./project.js";
/** Gain is multiplicative; muting a clip preserves its place in the audio timeline. */
export function clipAudioGain(project: Project, clip: Segment) {
  return project.appearance.muted || clip.muted
    ? 0
    : Math.max(0, Math.min(2, project.appearance.volume)) * (clip.volume ?? 1);
}
