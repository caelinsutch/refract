import type { Project, Segment } from "./project.js";
/** Music follows edited playback time, independent of source cuts, speed, and mute. */
export function backgroundAudioAt(project: Project, playbackMs: number) {
  const audio = project.backgroundAudio;
  if (!audio) return null;
  return {
    time: Math.max(0, playbackMs) % audio.duration,
    volume: audio.muted ? 0 : audio.volume,
  };
}
/** Gain is multiplicative; muting a clip preserves its place in the audio timeline. */
export function clipAudioGain(project: Project, clip: Segment) {
  return project.appearance.muted || clip.muted
    ? 0
    : Math.max(0, Math.min(2, project.appearance.volume)) * (clip.volume ?? 1);
}
